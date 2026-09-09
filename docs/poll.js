/* ============================================================================
   poll.js — anonymous Community polls
   ----------------------------------------------------------------------------
   Talks to a dedicated Supabase project for Community polls (public anon key +
   RLS) and degrades to localStorage if the backend is unreachable.

   Privacy:
     * No customer data / PII is ever stored. A random localStorage client_id is
       sent only for best-effort de-duplication.
     * Open-text answers are write-only from the browser (RLS blocks reads), so
       results for text polls are NEVER rendered.
     * Choice-poll results are shown per the poll's `showResults` setting
       (after_vote | always | never).

   Usage — drop an element anywhere and this script fills it in:
       <div data-poll="chargeback-usage-2026"></div>
   Poll definitions live in docs/data/polls.json.
   ========================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://jaxopniugzdcnajzhzuj.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_5jT3EW5KMobUzw4-_5MrAA_oQJzc6gV';

  var LS_VOTED  = 'ah_poll_voted';       // { pollId: optionId | true }
  var LS_COUNTS = 'ah_poll_counts';      // { pollId: { optionId: n } }  (fallback only)
  var LS_CLIENT = 'ah_poll_client_id';

  // ---------------------------------------------------------------- helpers
  function lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function clientId() {
    var id = null;
    try { id = localStorage.getItem(LS_CLIENT); } catch (e) {}
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'c-' + Date.now() + '-' + Math.random().toString(16).slice(2);
      try { localStorage.setItem(LS_CLIENT, id); } catch (e) {}
    }
    return id;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dataPrefix() {
    // Depth-aware path to the site-root data/ folder. Works both locally (site
    // root = docs/) and on GitHub Pages (site root = /Analytics-Hub/).
    var segs = location.pathname.split('/').filter(Boolean);
    if (segs.length && /\.[a-z0-9]+$/i.test(segs[segs.length - 1])) segs.pop(); // drop filename
    if (segs[0] === 'Analytics-Hub') segs.shift(); // drop GitHub Pages base
    var depth = segs.length;
    return depth > 0 ? '../'.repeat(depth) : './';
  }

  // ---------------------------------------------------------------- backend
  function rpc(fn, body) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('rpc ' + fn + ' ' + r.status);
      return r.json();
    });
  }

  function fetchResults(pollId) {
    return rpc('ah_poll_results', { p_poll_id: pollId }).then(toCountMap);
  }
  function submit(pollId, questionId, optionId, freeText) {
    return rpc('ah_poll_submit', {
      p_poll_id: pollId,
      p_question_id: questionId || null,
      p_option_id: optionId || null,
      p_free_text: freeText || null,
      p_client_id: clientId()
    }).then(toCountMap);
  }
  function toCountMap(rows) {
    var m = {};
    (rows || []).forEach(function (row) { m[row.option_id] = row.votes; });
    return m;
  }

  // ---------------------------------------------------------------- rendering
  function isClosed(poll) {
    if (poll.status && poll.status !== 'open') return true;
    if (poll.closesOn) {
      var d = new Date(poll.closesOn + 'T23:59:59Z');
      if (!isNaN(d) && Date.now() > d.getTime()) return true;
    }
    return false;
  }

  function renderChoice(host, poll, closed, opts) {
    var embed = !!(opts && opts.embed);
    var voted = lsGet(LS_VOTED, {});
    var myVote = voted[poll.id];
    var showResults = !embed && (
      poll.showResults === 'always' ||
      (poll.showResults === 'after_vote' && (myVote != null)) ||
      (closed && poll.showResults !== 'never'));

    function paint(counts) {
      var total = 0;
      poll.options.forEach(function (o) { total += (counts && counts[o.id]) || 0; });
      var rows = poll.options.map(function (o) {
        var n = (counts && counts[o.id]) || 0;
        var pct = total ? Math.round((n / total) * 100) : 0;
        var mine = myVote === o.id ? ' ah-poll-result--mine' : '';
        if (showResults) {
          return '<div class="ah-poll-result' + mine + '">' +
            '<div class="ah-poll-result-top"><span>' + esc(o.label) + '</span>' +
            '<span class="ah-poll-pct">' + pct + '%</span></div>' +
            '<div class="ah-poll-bar"><span style="width:' + pct + '%"></span></div>' +
            '</div>';
        }
        return '<button type="button" class="ah-poll-opt" data-opt="' + esc(o.id) + '"' +
          (closed ? ' disabled' : '') + '>' + esc(o.label) + '</button>';
      }).join('');

      var foot = showResults
        ? '<p class="ah-poll-foot">' + total + ' response' + (total === 1 ? '' : 's') +
          (closed ? ' · closed' : '') + '</p>'
        : (closed ? '<p class="ah-poll-foot">This poll is closed.</p>' : '');

      host.innerHTML =
        '<div class="ah-poll" role="group" aria-label="Poll">' +
        '<p class="ah-poll-q">' + esc(poll.question) + '</p>' +
        '<div class="ah-poll-opts">' + rows + '</div>' + foot + '</div>';

      if (!showResults && !closed) {
        host.querySelectorAll('.ah-poll-opt').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var optId = btn.getAttribute('data-opt');
            voted[poll.id] = optId; lsSet(LS_VOTED, voted); myVote = optId;
            // optimistic local count for fallback
            var lc = lsGet(LS_COUNTS, {}); lc[poll.id] = lc[poll.id] || {};
            lc[poll.id][optId] = (lc[poll.id][optId] || 0) + 1; lsSet(LS_COUNTS, lc);
            if (embed || poll.showResults === 'never') {
              submit(poll.id, 'main', optId, null).catch(function () {});
              host.innerHTML = '<div class="ah-poll"><p class="ah-poll-q">' +
                esc(poll.question) + '</p><p class="ah-poll-thanks">Thanks — your response was recorded.</p></div>';
              return;
            }
            showResults = true;
            submit(poll.id, 'main', optId, null)
              .then(paint)
              .catch(function () { paint(lsGet(LS_COUNTS, {})[poll.id] || {}); });
          });
        });
      }
    }

    if (showResults) {
      fetchResults(poll.id).then(paint).catch(function () {
        paint(lsGet(LS_COUNTS, {})[poll.id] || {});
      });
    } else {
      paint(null);
    }
  }

  function renderText(host, poll, closed, opts) {
    var voted = lsGet(LS_VOTED, {});
    if (voted[poll.id]) {
      host.innerHTML = '<div class="ah-poll"><p class="ah-poll-q">' + esc(poll.question) +
        '</p><p class="ah-poll-thanks">Thanks — your idea was recorded.</p></div>';
      return;
    }
    var max = poll.maxLength || 600;
    host.innerHTML =
      '<div class="ah-poll ah-poll--text">' +
      '<p class="ah-poll-q">' + esc(poll.question) + '</p>' +
      (poll.prompt ? '<p class="ah-poll-prompt">' + esc(poll.prompt) + '</p>' : '') +
      (closed
        ? '<p class="ah-poll-foot">This poll is closed.</p>'
        : '<textarea class="ah-poll-text" maxlength="' + max + '" rows="3" ' +
          'placeholder="Your idea (no customer names or confidential data)"></textarea>' +
          '<div class="ah-poll-textrow"><span class="ah-poll-count">0/' + max + '</span>' +
          '<button type="button" class="ah-poll-submit">Send idea</button></div>') +
      '</div>';
    if (closed) return;

    var ta = host.querySelector('.ah-poll-text');
    var counter = host.querySelector('.ah-poll-count');
    var btn = host.querySelector('.ah-poll-submit');
    ta.addEventListener('input', function () { counter.textContent = ta.value.length + '/' + max; });
    btn.addEventListener('click', function () {
      var val = (ta.value || '').trim();
      if (!val) { ta.focus(); return; }
      voted[poll.id] = true; lsSet(LS_VOTED, voted);
      submit(poll.id, 'main', null, val.slice(0, max)).catch(function () {});
      host.innerHTML = '<div class="ah-poll"><p class="ah-poll-q">' + esc(poll.question) +
        '</p><p class="ah-poll-thanks">Thanks — your idea was recorded.</p></div>';
    });
  }

  function renderMulti(host, poll, closed, opts) {
    var voted = lsGet(LS_VOTED, {});
    var thanks = '<div class="ah-poll">' +
      (poll.title ? '<p class="ah-poll-title">' + esc(poll.title) + '</p>' : '') +
      '<p class="ah-poll-thanks">Thanks — your feedback was recorded.</p></div>';
    if (voted[poll.id]) { host.innerHTML = thanks; return; }

    var qs = poll.questions || [];
    var answers = {};
    var idx = 0;

    function finish() {
      voted[poll.id] = true; lsSet(LS_VOTED, voted);
      qs.forEach(function (q) {
        if (q.type === 'text') {
          var v = (answers[q.id] || '').trim();
          if (v) submit(poll.id, q.id, null, v.slice(0, q.maxLength || 600)).catch(function () {});
        } else if (answers[q.id]) {
          submit(poll.id, q.id, answers[q.id], null).catch(function () {});
        }
      });
      host.innerHTML = thanks;
    }

    function draw() {
      if (closed) {
        host.innerHTML = '<div class="ah-poll">' +
          (poll.title ? '<p class="ah-poll-title">' + esc(poll.title) + '</p>' : '') +
          '<p class="ah-poll-foot">This poll is closed.</p></div>';
        return;
      }
      var q = qs[idx];
      var isLast = idx === qs.length - 1;
      var dots = qs.map(function (_, i) {
        return '<span class="ah-poll-dot' + (i === idx ? ' is-on' : (i < idx ? ' is-done' : '')) + '"></span>';
      }).join('');

      var body;
      if (q.type === 'text') {
        var max = q.maxLength || 600;
        body = '<textarea class="ah-poll-text" rows="3" maxlength="' + max +
          '" placeholder="Optional — no customer names or confidential data">' + esc(answers[q.id] || '') + '</textarea>' +
          (q.prompt ? '<p class="ah-poll-prompt">' + esc(q.prompt) + '</p>' : '');
      } else {
        body = '<div class="ah-poll-opts">' + q.options.map(function (o) {
          return '<button type="button" class="ah-poll-opt' + (answers[q.id] === o.id ? ' is-selected' : '') +
            '" data-opt="' + esc(o.id) + '"' + (o.end ? ' data-end="1"' : '') + '>' + esc(o.label) + '</button>';
        }).join('') + '</div>';
      }

      var canProceed = q.type === 'text' || !!answers[q.id];
      host.innerHTML = '<div class="ah-poll ah-poll--carousel" role="group" aria-label="Feedback">' +
        (poll.title ? '<p class="ah-poll-title">' + esc(poll.title) + '</p>' : '') +
        '<div class="ah-poll-progress"><span class="ah-poll-step">Question ' + (idx + 1) + ' of ' + qs.length +
        '</span><span class="ah-poll-dots">' + dots + '</span></div>' +
        '<div class="ah-poll-qblock"><p class="ah-poll-q">' + esc(q.question) + '</p>' + body + '</div>' +
        '<div class="ah-poll-nav">' +
        (idx > 0 ? '<button type="button" class="ah-poll-back">Back</button>' : '<span></span>') +
        '<button type="button" class="ah-poll-next"' + (canProceed ? '' : ' disabled') + '>' +
        (isLast ? 'Submit' : 'Next') + '</button></div></div>';

      var next = host.querySelector('.ah-poll-next');
      var back = host.querySelector('.ah-poll-back');
      if (back) back.addEventListener('click', function () {
        if (q.type === 'text') answers[q.id] = host.querySelector('.ah-poll-text').value;
        idx--; draw();
      });
      if (q.type === 'text') {
        host.querySelector('.ah-poll-text').addEventListener('input', function () {
          answers[q.id] = this.value;
        });
      } else {
        host.querySelectorAll('.ah-poll-opt').forEach(function (btn) {
          btn.addEventListener('click', function () {
            answers[q.id] = btn.getAttribute('data-opt');
            host.querySelectorAll('.ah-poll-opt').forEach(function (b) { b.classList.toggle('is-selected', b === btn); });
            next.disabled = false;
            var isEnd = btn.getAttribute('data-end') === '1';
            if (isEnd) setTimeout(finish, 220);            // terminal answer — end survey early
            else if (!isLast) setTimeout(function () { idx++; draw(); }, 220); // auto-advance
          });
        });
      }
      next.addEventListener('click', function () {
        if (q.type === 'text') answers[q.id] = host.querySelector('.ah-poll-text').value;
        else if (!answers[q.id]) return;
        var endSel = q.type !== 'text' && (q.options || []).some(function (o) { return o.id === answers[q.id] && o.end; });
        if (isLast || endSel) finish(); else { idx++; draw(); }
      });
    }

    draw();
  }

  function renderPoll(host, poll, opts) {
    injectStyles();
    var closed = isClosed(poll);
    if (poll.questions && poll.questions.length) renderMulti(host, poll, closed, opts);
    else if (poll.type === 'text') renderText(host, poll, closed, opts);
    else renderChoice(host, poll, closed, opts);
  }

  function hasResponded(pollId) {
    return lsGet(LS_VOTED, {})[pollId] != null;
  }

  // ---------------------------------------------------------------- styles
  function injectStyles() {
    if (document.getElementById('ah-poll-styles')) return;
    var css =
      '.ah-poll{border:1px solid var(--border,#e2e6ea);border-radius:12px;padding:1rem 1.1rem;' +
      'background:var(--surface,#fff);color:var(--text,#1b1b1b);max-width:520px;}' +
      '.ah-poll-q{font-weight:600;margin:0 0 .7rem;line-height:1.35;}' +
      '.ah-poll-prompt{margin:-.4rem 0 .7rem;font-size:.9rem;color:var(--text-muted,#5a6470);}' +
      '.ah-poll-opts{display:flex;flex-direction:column;gap:.5rem;}' +
      '.ah-poll-opt{text-align:left;padding:.6rem .75rem;border:1px solid var(--border,#e2e6ea);' +
      'border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;transition:.15s;}' +
      '.ah-poll-opt:hover:not([disabled]){border-color:var(--accent,#0078d4);' +
      'background:color-mix(in srgb,var(--accent,#0078d4) 8%,transparent);}' +
      '.ah-poll-opt[disabled]{opacity:.6;cursor:default;}' +
      '.ah-poll-result{margin-bottom:.5rem;}' +
      '.ah-poll-result-top{display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:.25rem;}' +
      '.ah-poll-pct{color:var(--text-muted,#5a6470);font-variant-numeric:tabular-nums;}' +
      '.ah-poll-bar{height:8px;border-radius:999px;background:color-mix(in srgb,var(--text,#1b1b1b) 8%,transparent);overflow:hidden;}' +
      '.ah-poll-bar>span{display:block;height:100%;border-radius:999px;background:var(--accent,#0078d4);transition:width .4s ease;}' +
      '.ah-poll-opt--mine .ah-poll-bar>span,.ah-poll-result--mine .ah-poll-bar>span{background:var(--accent,#0078d4);}' +
      '.ah-poll-result--mine .ah-poll-result-top span:first-child::after{content:" \\2713";color:var(--accent,#0078d4);}' +
      '.ah-poll-foot{margin:.6rem 0 0;font-size:.8rem;color:var(--text-muted,#5a6470);}' +
      '.ah-poll-thanks{margin:.3rem 0 0;color:var(--accent,#0078d4);font-weight:500;}' +
      '.ah-poll-text{width:100%;box-sizing:border-box;border:1px solid var(--border,#e2e6ea);border-radius:8px;' +
      'padding:.55rem .65rem;font:inherit;color:inherit;background:transparent;resize:vertical;}' +
      '.ah-poll-textrow{display:flex;align-items:center;justify-content:space-between;margin-top:.5rem;}' +
      '.ah-poll-count{font-size:.78rem;color:var(--text-muted,#5a6470);font-variant-numeric:tabular-nums;}' +
      '.ah-poll-submit{padding:.5rem .95rem;border:0;border-radius:8px;background:var(--accent,#0078d4);' +
      'color:#fff;font:inherit;font-weight:600;cursor:pointer;}' +
      '.ah-poll-submit:hover{filter:brightness(1.05);}' +
      '.ah-poll-title{font-weight:700;font-size:1.05rem;margin:0 0 .8rem;}' +
      '.ah-poll--multi .ah-poll-qblock{margin:0 0 1rem;}' +
      '.ah-poll--multi .ah-poll-q{margin:0 0 .5rem;font-weight:600;font-size:.95rem;}' +
      '.ah-poll-opt.is-selected{border-color:var(--accent,#0078d4);' +
      'background:color-mix(in srgb,var(--accent,#0078d4) 12%,transparent);font-weight:600;}' +
      '.ah-poll-opt.is-selected::after{content:" \\2713";color:var(--accent,#0078d4);float:right;}' +
      '.ah-poll-actions{margin-top:.4rem;}' +
      '.ah-poll-submit[disabled]{opacity:.5;cursor:not-allowed;}' +
      '.ah-poll-progress{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin:0 0 .7rem;}' +
      '.ah-poll-step{font-size:.75rem;color:var(--text-muted,#6b7280);}' +
      '.ah-poll-dots{display:inline-flex;gap:.32rem;}' +
      '.ah-poll-dot{width:8px;height:8px;border-radius:999px;background:transparent;border:1.5px solid var(--border,#d1d5db);}' +
      '.ah-poll-dot.is-on{background:var(--accent,#0078d4);border-color:var(--accent,#0078d4);}' +
      '.ah-poll-dot.is-done{background:color-mix(in srgb,var(--accent,#0078d4) 45%,transparent);border-color:transparent;}' +
      '@keyframes ahPollFade{from{opacity:0;transform:translateX(8px);}to{opacity:1;transform:none;}}' +
      '.ah-poll--carousel .ah-poll-qblock{margin:.2rem 0 .9rem;animation:ahPollFade .22s ease;}' +
      '.ah-poll--carousel .ah-poll-q{margin:0 0 .6rem;font-weight:600;font-size:.95rem;}' +
      '.ah-poll-nav{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.6rem;}' +
      '.ah-poll-back{background:transparent;border:1px solid var(--border,#d1d5db);color:inherit;padding:.45rem .9rem;border-radius:8px;font:inherit;cursor:pointer;}' +
      '.ah-poll-next{background:var(--accent,#0078d4);border:0;color:#fff;padding:.5rem 1.15rem;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;}' +
      '.ah-poll-next[disabled]{opacity:.5;cursor:not-allowed;}' +
      '@media (prefers-reduced-motion:reduce){.ah-poll--carousel .ah-poll-qblock{animation:none;}}';
    var s = document.createElement('style');
    s.id = 'ah-poll-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- boot
  var pollsPromise = null;
  function loadPolls() {
    if (!pollsPromise) {
      pollsPromise = fetch(dataPrefix() + 'data/polls.json', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) { return (j && j.polls) || []; })
        .catch(function () { return []; });
    }
    return pollsPromise;
  }

  function mountAll() {
    var hosts = document.querySelectorAll('[data-poll]:not([data-poll-mounted])');
    if (!hosts.length) return;
    loadPolls().then(function (polls) {
      var byId = {};
      polls.forEach(function (p) { byId[p.id] = p; });
      hosts.forEach(function (host) {
        host.setAttribute('data-poll-mounted', '1');
        var poll = byId[host.getAttribute('data-poll')];
        if (!poll) { host.innerHTML = ''; return; }
        // Embeds (data-poll on a page) hide once this browser has responded.
        // This uses only the on-device localStorage flag — no user data is stored.
        if (hasResponded(poll.id)) { host.hidden = true; host.style.display = 'none'; return; }
        renderPoll(host, poll, { embed: true });
      });
    });
  }

  // Public API for pages that build DOM dynamically (e.g. community page).
  window.ahPolls = {
    load: loadPolls,
    render: renderPoll,
    mount: mountAll,
    responded: hasResponded,
    openPolls: function () {
      return loadPolls().then(function (ps) {
        return ps.filter(function (p) { return !isClosed(p); })
          .sort(function (a, b) { return (a.order == null ? 50 : a.order) - (b.order == null ? 50 : b.order); });
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
})();
