/*
 * taxonomy.js — deterministic smart-tagging for the Learning Feed.
 *
 * Assigns a bounded set of searchable tags to each change/entry from its text
 * (title + description + area + product). Rules-based on purpose: it runs in the
 * unattended nightly job with no network and no LLM, so it is cheap, repeatable,
 * and auditable — the same principles as the rest of the scanner.
 *
 * Tags are grouped so search can match the words people actually type:
 *   product   — the app/service the change belongs to
 *   lifecycle — ga / preview / rolling-out / in-development / launched / deprecated / retired / cancelled
 *   cloud     — gcc / gcc-high / dod / government / worldwide / education
 *   topic     — pricing, credits, billing, paygo, dlp, audit, residency, model, agent, api, ...
 *
 * tagText(text) -> sorted unique array of tags.
 * entryId(e)    -> stable id used to cache tags in the persistent store.
 */
'use strict';

// Each rule: [tag, regex]. Regexes are case-insensitive, matched against the
// lowercased haystack. Word-ish boundaries keep false positives down.
const RULES = [
  // ---- products / apps
  ['powerpoint', /\bpower ?point\b/],
  ['excel', /\bexcel\b/],
  ['word', /\b(in word|agent mode in word|with copilot in word|microsoft word)\b/],
  ['outlook', /\boutlook\b/],
  ['onenote', /\bone ?note\b/],
  ['loop', /\bloop\b/],
  ['teams', /\bteams\b/],
  ['sharepoint', /\bsharepoint\b/],
  ['onedrive', /\bone ?drive\b/],
  ['cowork', /\bcowork\b/],
  ['workiq', /\bwork ?iq\b/],
  ['copilot-studio', /\bcopilot studio\b/],
  ['copilot-chat', /\bcopilot chat\b/],
  ['github-copilot', /\bgithub copilot\b/],
  ['viva', /\bviva\b/],
  ['purview', /\bpurview\b/],
  ['sales-agent', /\bsales agent\b/],
  ['researcher', /\bresearcher\b/],

  // ---- agents / models
  ['agent', /\bagent(s|ic)?\b/],
  ['autonomous-agent', /\bautonomous agent/],
  ['declarative-agent', /\bdeclarative agent/],
  ['agent-evaluation', /\bagent eval|\beval(uation)?s?\b/],
  ['model', /\bmodel(s)?\b/],
  ['anthropic', /\banthropic|\bclaude\b/],
  ['openai', /\b(gpt-?\d|openai|o\d\b)/],
  ['model-selection', /\bmodel (selector|selection|choice|routing|picker)\b/],

  // ---- lifecycle / status
  ['ga', /\b(generally available|general availability|\bga\b)/],
  ['preview', /\bpreview\b/],
  ['rolling-out', /\brolling out\b/],
  ['in-development', /\bin development\b/],
  ['launched', /\blaunched\b/],
  ['deprecated', /\bdeprecat/],
  ['retired', /\bretire(d|ment)?\b/],
  ['cancelled', /\bcancel?led\b/],
  ['end-of-life', /\bend[- ]of[- ]life|\beol\b|\bsunset/],

  // ---- cloud / audience
  ['gcc-high', /\bgcc[- ]?high\b/],
  ['gcc', /\bgcc\b/],
  ['dod', /\bdod\b/],
  ['government', /\bgovernment\b|\bgov cloud\b|\bgovernment cloud/],
  ['worldwide', /\bworldwide\b/],
  ['education', /\beducation\b|\bedu\b|\bstudents?\b/],

  // ---- billing / FinOps
  ['pricing', /\bpric(e|ing)\b/],
  ['licensing', /\blicens/],
  ['copilot-credits', /\bcopilot credit|\bcredits?\b/],
  ['usage-based-billing', /\busage[- ]based billing|\bubb\b/],
  ['pay-as-you-go', /\bpay[- ]as[- ]you[- ]go|\bpaygo\b|\bpay as you go\b/],
  ['prepaid', /\bprepaid\b|\bpre[- ]purchase\b|\bcapacity pack|\bp3\b/],
  ['cost-management', /\bcost management\b/],
  ['spending-policy', /\bspending polic|\bbilling polic/],
  ['credit-request', /\bcredit request|\brequest polic/],
  ['chargeback', /\bchargeback\b/],
  ['consumption', /\bconsumption\b/],
  ['budget', /\bbudget\b|\bspending limit|\bcredit limit/],
  ['focus', /\bfocus\b/],
  ['finops', /\bfinops\b/],
  ['macc', /\bmacc\b|\bazure consumption commitment/],

  // ---- governance / security / compliance
  ['dlp', /\bdlp\b|\bdata loss prevention/],
  ['audit', /\baudit\b/],
  ['compliance', /\bcompliance\b/],
  ['data-residency', /\bdata residency|\bresidency\b/],
  ['eu-data-boundary', /\beu data boundary|\beudb\b/],
  ['governance', /\bgovernance\b/],
  ['rbac', /\brbac\b|\brole[- ]based|\baccess control/],
  ['admin-center', /\badmin center\b|\bmac\b/],
  ['insider-risk', /\binsider risk/],
  ['sensitivity-label', /\bsensitivity label|\bmip\b/],
  ['discovery-setting', /\bdiscovery setting/],

  // ---- reporting / analytics / API
  ['usage-report', /\busage report/],
  ['analytics', /\banalytics\b/],
  ['insights', /\binsights\b/],
  ['dashboard', /\bdashboard\b/],
  ['api', /\bapi\b/],
  ['graph-api', /\bgraph api|\bmicrosoft graph/],
  ['export', /\bexport\b/],
  ['connector', /\bconnector\b/],
  ['adoption', /\badoption\b/],
  ['assisted-hours', /\bassisted hour/],
  ['csat', /\bcsat\b|\bsatisfaction\b/],

  // ---- roadmap / message center
  ['roadmap', /\broadmap\b/],
  ['message-center', /\bmessage cent(er|re)\b|\bmc\d{6,}/],
  ['plan-for-change', /\bplan for change\b/],

  // ---- capabilities
  ['agent-mode', /\bagent mode\b/],
  ['automation', /\bautomat(e|ion|ed)\b|\bscheduled prompt|\bevent[- ]driven/],
  ['browser-use', /\bbrowser (use|task)|\blocal browser/],
  ['plugin', /\bplugin|\bconnector\b/],
  ['search', /\bcopilot search\b|\benterprise search\b/]
];

function tagText(text) {
  const hay = String(text || '').toLowerCase();
  const out = [];
  for (const [tag, re] of RULES) if (re.test(hay)) out.push(tag);
  return out.sort();
}

// Query-side synonyms: what people TYPE -> canonical tag(s). This is what makes
// search feel smart — "paygo", "gov", "gpt" all resolve to the right tag even
// though the source text never used that exact word.
const ALIASES = {
  paygo: 'pay-as-you-go', payg: 'pay-as-you-go', 'pay-as-you-go': 'pay-as-you-go',
  gov: 'government', 'gov cloud': 'government', govcloud: 'government',
  gpt: 'openai', 'gpt-4': 'openai', 'gpt-5': 'openai', 'o1': 'openai', 'o3': 'openai',
  claude: 'anthropic',
  credits: 'copilot-credits', credit: 'copilot-credits',
  ubb: 'usage-based-billing',
  p3: 'prepaid', 'pre-purchase': 'prepaid', prepurchase: 'prepaid', 'capacity pack': 'prepaid',
  mac: 'admin-center', 'admin center': 'admin-center',
  dlp: 'dlp', 'data loss prevention': 'dlp',
  eudb: 'eu-data-boundary', 'data boundary': 'eu-data-boundary',
  residency: 'data-residency',
  retire: 'retired', retirement: 'retired', eol: 'end-of-life', sunset: 'end-of-life',
  deprecate: 'deprecated', deprecation: 'deprecated',
  ga: 'ga', 'generally available': 'ga',
  ppt: 'powerpoint', deck: 'powerpoint', slides: 'powerpoint',
  mc: 'message-center', 'message center': 'message-center',
  focus: 'focus', finops: 'finops',
  chargeback: 'chargeback', budget: 'budget', limit: 'budget',
  csat: 'csat', satisfaction: 'csat',
  rbac: 'rbac', role: 'rbac',
  api: 'api', graph: 'graph-api'
};

// Resolve a raw query into { tags:[canonical], terms:[raw tokens] }. A token that
// resolves to a tag (via alias, or by being a canonical tag itself) is NOT also
// kept as a required text term. Remaining tokens are free-text terms. A change
// matches when every tag is present AND every text term appears in its text.
const TAG_SET = new Set(RULES.map(r => r[0]));
function resolveQuery(q) {
  const raw = String(q || '').toLowerCase().trim();
  if (!raw) return { tags: [], terms: [] };
  const tags = new Set(), terms = [];
  let rest = raw;
  // multi-word aliases first (consume them out of the string)
  Object.keys(ALIASES).filter(k => k.indexOf(' ') >= 0).forEach(k => {
    if (rest.indexOf(k) >= 0) { tags.add(ALIASES[k]); rest = rest.split(k).join(' '); }
  });
  rest.split(/\s+/).filter(Boolean).forEach(tok => {
    if (ALIASES[tok]) { tags.add(ALIASES[tok]); return; }      // alias -> tag, consumed
    if (TAG_SET.has(tok)) { tags.add(tok); return; }           // typed a canonical tag, consumed
    terms.push(tok);                                            // free-text term
  });
  return { tags: Array.from(tags), terms: terms };
}

// Stable per-entry id for the persistent tag cache. Roadmap/MC items have ids;
// doc pages are keyed by their URL. Feed slug namespaces it.
function entryId(feedSlug, item) {
  const key = item.id || item.url || item.u || item.t || '';
  return feedSlug + '|' + String(key);
}

module.exports = { tagText, resolveQuery, entryId, RULES, ALIASES };
