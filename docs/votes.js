/* ============================================================================
   votes.js — thumbs up on every report card
   ----------------------------------------------------------------------------
   Mirrors the widget on Copilot Analytics Labs, and talks to the SAME backend
   so a template shows one set of numbers wherever it appears.

   Labs stores votes in Supabase:
       read   GET  {SUPABASE}/rest/v1/card_votes?select=card_id,up,down
       write  POST {SUPABASE}/rest/v1/rpc/apply_vote
              body {p_card_id, p_up, p_down} -> returns the new {up, down}

   Only the up vote is surfaced here. The `down` column still exists in the
   shared table and is still returned by the API — it is simply not rendered,
   and this page never sends a negative-vote delta. That keeps the schema and
   the Labs widget untouched.

   The key below is Supabase's *publishable* (anon) key. It is designed to be
   public and is already served in the Labs bundle; row-level security, not key
   secrecy, is what protects the table. Point SUPABASE_URL/KEY at a different
   project to decouple the two sites.

   If the backend is unreachable the widget still works — counts fall back to
   localStorage so the page never shows a broken control.

   Card ids are prefixed `ah-` so Hub rows cannot collide with Labs rows in the
   shared table.
   ========================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hvrstvxgjtjqzoiucsfa.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_h3R4-v8IEEcLraqzjh4hXQ_YU-FLPpM';
  var ID_PREFIX    = 'ah-';

  var LS_MY_VOTES = 'ah_card_my_votes';
  var LS_COUNTS   = 'ah_card_vote_counts';

  var counts = {};        // cardId -> {up, down}
  var loaded = false;

  // ---------------------------------------------------------------- storage
  function readLS(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private mode */ }
    return fallback;
  }

  function writeLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function myVote(id)        { return readLS(LS_MY_VOTES, {})[id] || null; }
  function setMyVote(id, v)  {
    var all = readLS(LS_MY_VOTES, {});
    if (v) all[id] = v; else delete all[id];
    writeLS(LS_MY_VOTES, all);
  }

  // ------------------------------------------------------------------ api
  function headers() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    };
  }

  function loadCounts() {
    if (loaded) return Promise.resolve();
    loaded = true;
    return fetch(SUPABASE_URL + '/rest/v1/card_votes?select=card_id,up,down',
                 { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (rows) {
        rows.forEach(function (row) {
          counts[row.card_id] = { up: row.up || 0, down: row.down || 0 };
        });
      })
      .catch(function () {
        counts = readLS(LS_COUNTS, {});     // offline / blocked
      });
  }

  function applyVote(id, dUp) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/apply_vote', {
      method: 'POST',
      headers: Object.assign(headers(), { 'Prefer': 'return=representation' }),
      body: JSON.stringify({ p_card_id: id, p_up: dUp, p_down: 0 })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        var row = Array.isArray(data) ? data[0] : data;
        if (!row) return Promise.reject();
        return { up: row.up || 0, down: row.down || 0 };
      })
      .catch(function () {
        // keep a local tally so the number the user just changed still moves
        var local = readLS(LS_COUNTS, {});
        var cur = local[id] || { up: 0, down: 0 };
        var next = { up: Math.max(cur.up + dUp, 0), down: cur.down || 0 };
        local[id] = next;
        writeLS(LS_COUNTS, local);
        return next;
      });
  }

  // ------------------------------------------------------------------- ui
  var ICON_UP =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
    '<path fill="currentColor" d="M6.3 14h5a1.6 1.6 0 0 0 1.56-1.26l1.1-5A1.6 1.6 0 0 0 12.4 5.8H9.9l.36-1.9a1.5 1.5 0 0 0-2.6-1.3L5.3 5.4V14Zm-3.9 0h2V6h-2A1.4 1.4 0 0 0 1 7.4v5.2A1.4 1.4 0 0 0 2.4 14Z"/></svg>';

  function render(root, id) {
    var c = counts[id] || { up: 0, down: 0 };
    var mine = myVote(id);
    var btn = root.querySelector('.ah-vote-up');
    btn.setAttribute('aria-pressed', mine === 'up');
    btn.classList.toggle('is-on', mine === 'up');
    btn.setAttribute('aria-label',
      (mine === 'up' ? 'Remove your vote. ' : 'Mark as useful. ') +
      c.up + (c.up === 1 ? ' vote' : ' votes'));
    root.querySelector('.ah-vote-up .ah-vote-n').textContent = c.up;
  }

  function cast(root, id) {
    var mine = myVote(id);
    var dUp = mine === 'up' ? -1 : 1;      // clicking again retracts
    var next = mine === 'up' ? null : 'up';

    var cur = counts[id] || { up: 0, down: 0 };
    counts[id] = { up: Math.max(cur.up + dUp, 0), down: cur.down || 0 };
    setMyVote(id, next);
    render(root, id);                      // optimistic

    root.classList.add('is-pending');
    applyVote(id, dUp).then(function (server) {
      counts[id] = server;
      render(root, id);
    }).then(function () {
      root.classList.remove('is-pending');
    });
  }

  function widget(id) {
    var el = document.createElement('div');
    el.className = 'ah-vote';
    el.innerHTML =
      '<button type="button" class="ah-vote-up" aria-label="Mark as useful">' +
        ICON_UP + '<span class="ah-vote-n">0</span></button>';
    el.querySelector('.ah-vote-up')
      .addEventListener('click', function (e) { e.preventDefault(); cast(el, id); });
    return el;
  }

  // Derive a stable id from the card's repo link, so a card keeps its votes
  // even if its title or position changes — and so the same template shows the
  // same count on the home page and in the explore-reports table.
  function idFor(card) {
    var a = card.querySelector('a[href*="github.com/"]');
    if (a) {
      var m = a.getAttribute('href').match(/github\.com\/[^/]+\/([^/?#]+)/i);
      if (m) return ID_PREFIX + m[1].toLowerCase();
    }
    var t = card.querySelector('.rf-title, h3, .tool-chip');
    return ID_PREFIX + (t ? t.textContent.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'unknown');
  }

  function mount() {
    var cards = document.querySelectorAll('.rf-card');
    var rows = document.querySelectorAll('td.col-actions');
    if (!cards.length && !rows.length) return;

    loadCounts().then(function () {
      // home page: card grid
      cards.forEach(function (card) {
        if (card.querySelector('.ah-vote')) return;
        var id = idFor(card);
        var foot = card.querySelector('.rf-foot');
        var w = widget(id);
        if (foot) foot.insertBefore(w, foot.querySelector('.rf-cta'));
        else card.appendChild(w);
        render(w, id);
      });
      // explore-reports: table rows
      rows.forEach(function (cell) {
        if (cell.querySelector('.ah-vote')) return;
        var id = idFor(cell.closest('tr') || cell);
        var w = widget(id);
        cell.appendChild(w);
        render(w, id);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Both catalogs render their rows from JS AFTER this script runs, and re-render
  // on filter and search. A timeout would be a guess; watch the DOM instead and
  // mount whenever new cards or action cells appear.
  var scheduled = false;
  var observer = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      mount();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
