/* ============================================================================
   report-badges.js — analytics-driven tags on report cards, shared by the
   homepage (docs/index.html) and the reports page (docs/choose-report/).

   Reads the same data the analytics pipeline regenerates:
     - choose-report embeds it as <script id="mk-sort" type="application/json">
     - the homepage fetches docs/data/sort-data.json
   so the badges recompute automatically whenever that data refreshes.

   Rules (one badge per card, priority Trending > New > Popular):
     * Trending — top 5 reports by views over the trailing 7 days (viewsWeek)
     * New      — repo created within the last 45 days
     * Popular  — top 5 reports by all-time views (viewsTotal)

   On the homepage, each card is also wired to open the reports-page flyout at
   choose-report/#d=<id> (the reports page already deep-links that hash), instead
   of jumping straight to GitHub. The reports-page cards already open the flyout
   in place, so only badges are added there.
   ========================================================================== */
(function () {
  'use strict';

  var TRENDING_TOP = 5;
  var POPULAR_TOP = 5;
  var NEW_DAYS = 45;

  /* Homepage cards are hand-written <article>s with no data-id. Map them to the
     reports-page id by GitHub repo slug, and by title for the repo-less web
     apps. Keys are lower-cased. */
  var ID_BY_REPO = {
    'microsoft/ai-in-one-dashboard': 'ai-in-one',
    'microsoft/what-i-did-copilot': 'what-i-did',
    'microsoft/decodingsuperusage': 'super-usage',
    'microsoft/what-i-did-with-cowork': 'cowork-impact',
    'microsoft/pax': 'pax',
    'microsoft/copilotchatanalytics': 'chat-agent',
    'microsoft/valuelens-for-microsoft-copilot': 'value-lens',
    'microsoft/consumptioncentral-for-microsoft-copilot': 'consumption-central',
    'microsoft/m365usageanalytics': 'm365-readiness',
    'microsoft/superuserimpact': 'super-user-impact',
    'microsoft/agentevaluator-for-copilot-studio': 'agent-evaluator',
    'microsoft/githubcopilotimpact': 'ghcp-impact',
    'microsoft/githubcopilotpanel': 'ghcp-panel',
    'microsoft/creditusage': 'cowork-billing-report',
    'microsoft/customizecopilot': 'customize',
    'microsoft/ess': 'ess-insights',
    'olivierpecheux/copilot-adoption-sentiment-report': 'adoption-sentiment',
    'microsoft/personal-dashboard': 'personal-copilot-dashboard'
  };
  var ID_BY_TITLE = {
    'm365 copilot productivity roi calculator': 'roi-calc',
    'cowork chargeback (web app)': 'cowork-chargeback-app',
    'cowork policy helper (web app)': 'cowork-policy-helper-app',
    'finops & focus cost report (web app)': 'finops-focus-app',
    'cowork roi model (web app)': 'cowork-roi-model-app'
  };

  /* Per-category colour coding (Option B): every card in a category shares one
     colour, so the left-accent stripe is a real legend rather than decoration.
     Used on both the homepage grid and the reports page. */
  var CATEGORY_COLOR = {
    'usage-intelligence': '#8661c5', // purple
    'adoption-behavior':  '#0078d4', // blue
    'impact-roi':         '#00B294', // teal
    'readiness':          '#FFB900', // amber
    'developer':          '#24292f', // graphite
    'tooling-extension':  '#4cc2ff'  // cyan
  };
  var ID_CATEGORY = {
    'ai-in-one': 'usage-intelligence', 'what-i-did': 'developer',
    'super-usage': 'adoption-behavior', 'cowork-impact': 'impact-roi',
    'pax': 'tooling-extension', 'chat-agent': 'usage-intelligence',
    'value-lens': 'impact-roi', 'consumption-central': 'impact-roi',
    'm365-readiness': 'readiness', 'super-user-impact': 'adoption-behavior',
    'agent-evaluator': 'usage-intelligence', 'ghcp-impact': 'developer',
    'ghcp-panel': 'developer',
    'cowork-billing-report': 'impact-roi', 'customize': 'tooling-extension',
    'ess-insights': 'impact-roi', 'adoption-sentiment': 'adoption-behavior',
    'personal-copilot-dashboard': 'adoption-behavior', 'roi-calc': 'impact-roi',
    'cowork-chargeback-app': 'impact-roi', 'cowork-policy-helper-app': 'readiness',
    'finops-focus-app': 'impact-roi', 'cowork-roi-model-app': 'impact-roi',
    'cowork-team-report': 'impact-roi', 'cowork-adoption': 'adoption-behavior',
    'ai-solutions-intelligence': 'usage-intelligence'
  };
  function categoryOf(card, id) {
    // Reports-page rf-cards state their primary category directly.
    if (card.dataset && card.dataset.primary && CATEGORY_COLOR[card.dataset.primary]) {
      return card.dataset.primary;
    }
    // Homepage cards: first token of data-cat is the primary category.
    if (card.dataset && card.dataset.cat) {
      var first = card.dataset.cat.split(/\s+/)[0];
      if (CATEGORY_COLOR[first]) return first;
    }
    // Fallback: by report id (covers pk-rows, which carry neither attribute).
    return (id && ID_CATEGORY[id]) || null;
  }

  function computeSets(reports) {
    var rows = [];
    Object.keys(reports).forEach(function (id) {
      var r = reports[id] || {};
      rows.push({
        id: id,
        vw: typeof r.viewsWeek === 'number' ? r.viewsWeek : -1,
        vt: typeof r.viewsTotal === 'number' ? r.viewsTotal : -1,
        created: r.created || null
      });
    });
    var now = Date.now();
    var trending = new Set(
      rows.filter(function (r) { return r.vw > 0; })
          .sort(function (a, b) { return b.vw - a.vw; })
          .slice(0, TRENDING_TOP).map(function (r) { return r.id; })
    );
    var popular = new Set(
      rows.filter(function (r) { return r.vt > 0; })
          .sort(function (a, b) { return b.vt - a.vt; })
          .slice(0, POPULAR_TOP).map(function (r) { return r.id; })
    );
    var isNew = new Set(
      rows.filter(function (r) {
        if (!r.created) return false;
        var d = (now - new Date(r.created).getTime()) / 86400000;
        return d >= 0 && d <= NEW_DAYS;
      }).map(function (r) { return r.id; })
    );
    return { trending: trending, popular: popular, isNew: isNew };
  }

  function badgeFor(id, sets) {
    if (sets.trending.has(id)) return { cls: 'trending', label: '\uD83D\uDD25 Trending' };
    if (sets.isNew.has(id))    return { cls: 'new',      label: 'New' };
    if (sets.popular.has(id))  return { cls: 'popular',  label: '\u2605 Popular' };
    return null;
  }

  function idForCard(card) {
    if (card.dataset && card.dataset.id) return card.dataset.id;         // reports page
    if (card.dataset && card.dataset.report) return card.dataset.report; // explicit override
    var a = card.querySelector('.rf-cta, a[href]');
    var href = a ? (a.getAttribute('href') || '') : '';
    var dm = /#d=([^&]+)/.exec(href);
    if (dm) return decodeURIComponent(dm[1]);
    var m = /github\.com\/([^\/]+\/[^\/?#]+)/i.exec(href);
    if (m) {
      var slug = m[1].toLowerCase().replace(/\.git$/, '');
      if (ID_BY_REPO[slug]) return ID_BY_REPO[slug];
    }
    var t = card.querySelector('.rf-title');
    if (t) {
      var key = t.textContent.trim().toLowerCase();
      if (ID_BY_TITLE[key]) return ID_BY_TITLE[key];
    }
    return null;
  }

  // Shared with report-sort.js so both features resolve a card to its report id
  // the same way, without duplicating the mapping.
  window.AHReportIdForCard = idForCard;

  function injectStyles() {
    if (document.getElementById('rf-tag-styles')) return;
    var st = document.createElement('style');
    st.id = 'rf-tag-styles';
    st.textContent =
      '.rf-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;' +
      'letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:100px;color:#fff;' +
      'line-height:1.4;white-space:nowrap;}' +
      '.rf-tag--trending{background:linear-gradient(135deg,#e8590c,#e3008c);}' +
      '.rf-tag--popular{background:linear-gradient(135deg,#8661c5,#0078d4);}' +
      '.rf-tag--new{background:var(--accent,#0078d4);}' +
      '[data-theme="dark"] .rf-tag--new{color:#0b0b12;}' +
      '.pk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
      /* Category left-accent stripe (Option B colour coding) */
      '.rf-catcoded{border-left:4px solid var(--cat-c,var(--accent,#0078d4)) !important;}' +
      '.pk-row.rf-catcoded{border-left:4px solid var(--cat-c,var(--accent,#0078d4)) !important;}';
    document.head.appendChild(st);
  }

  function wireFlyout(card, id) {
    // Record the id on the card so later features (sort) resolve it directly,
    // even though we rewrite the CTA href away from GitHub below.
    if (card.dataset) card.dataset.report = id;
    // Point the card's primary action at the reports-page flyout deep link.
    var cta = card.querySelector('.rf-cta');
    var href = 'choose-report/#d=' + encodeURIComponent(id);
    if (cta && cta.tagName === 'A') {
      cta.setAttribute('href', href);
      cta.removeAttribute('target');
      cta.removeAttribute('rel');
    }
    // Make the whole card clickable, without stealing clicks from real links.
    card.style.cursor = 'pointer';
    card.addEventListener('click', function (e) {
      // Let real controls handle their own clicks (links, buttons, the vote widget).
      if (e.target.closest('a, button, .ah-vote, [role="button"]')) return;
      window.location.href = href;
    });
  }

  function run(reports) {
    injectStyles();
    var sets = computeSets(reports);
    var onHomepage = !document.getElementById('mk-sort'); // reports page embeds mk-sort
    // Reports page renders two card systems (the compact .rf-card matrix grid and
    // the detailed .pk-row list); badge whichever is present. Homepage has .rf-card.
    var cards = document.querySelectorAll('.rf-card, .pk-row');
    Array.prototype.forEach.call(cards, function (card) {
      var id = idForCard(card);
      if (!id) return;
      // Category colour coding (Option B): one colour per category.
      var cat = categoryOf(card, id);
      if (cat && CATEGORY_COLOR[cat]) {
        card.style.setProperty('--cat-c', CATEGORY_COLOR[cat]);
        card.classList.add('rf-catcoded');
      }
      // Replace any editorial "New" chip with the analytics badge system.
      var oldNew = card.querySelector('.rf-new');
      if (oldNew) oldNew.remove();
      var badge = badgeFor(id, sets);
      if (badge && !card.querySelector('.rf-tag')) {
        var top = card.querySelector('.rf-top, .pk-top');
        if (top) {
          var span = document.createElement('span');
          span.className = 'rf-tag rf-tag--' + badge.cls;
          span.textContent = badge.label;
          top.appendChild(span);
        }
      }
      if (onHomepage) wireFlyout(card, id);
    });
  }

  function boot() {
    var inline = document.getElementById('mk-sort'); // reports page
    if (inline) {
      try { run(JSON.parse(inline.textContent).reports); } catch (e) {}
      return;
    }
    // Homepage: depth-aware path to the site-root data folder.
    fetch('data/sort-data.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { run(d.reports); })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
