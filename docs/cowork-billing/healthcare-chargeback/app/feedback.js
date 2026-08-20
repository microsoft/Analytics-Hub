/* feedback.js - self-contained "Request a change" panel for the Cowork web apps.
   Client-side only: composes a request the user can copy or open in email. No API / no live submit.
   Self-wires from the #fbView element's data-* attributes. ES5, ASCII only. */
(function () {
    'use strict';
    function $(id) { return document.getElementById(id); }
    function trim(s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); }

    var CSS =
        '.top-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:0.5rem;flex-wrap:wrap;}' +
        '.fb-open{background:none;border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:0.4rem 0.9rem;font-family:inherit;font-size:0.85rem;cursor:pointer;}' +
        '.fb-open:hover{border-color:var(--copilot-blue);color:var(--copilot-blue);}' +
        '.fb-chips{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;}' +
        '.fb-chip{background:var(--surface-raised);border:1px solid var(--border);color:var(--text-primary);border-radius:999px;padding:0.35rem 0.85rem;font-family:inherit;font-size:0.82rem;cursor:pointer;}' +
        '.fb-chip:hover{border-color:var(--copilot-blue);color:var(--copilot-blue);}' +
        '.fb-note{font-size:0.82rem;color:var(--text-secondary);margin-top:0.25rem;}' +
        '.fb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:0.5rem;}' +
        '.fb-field{display:flex;flex-direction:column;margin-bottom:1rem;}' +
        '.fb-field label{font-weight:600;font-size:0.85rem;margin-bottom:0.35rem;color:var(--text-primary);}' +
        '.fb-field input,.fb-field select,.fb-field textarea{padding:0.55rem 0.7rem;font-size:0.95rem;border:1px solid var(--border);border-radius:8px;background-color:var(--surface-raised);color:var(--text-primary);font-family:inherit;width:100%;box-sizing:border-box;}' +
        '.fb-field textarea{resize:vertical;}' +
        '.fb-actions{display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;}' +
        '.fb-status{font-size:0.85rem;color:var(--copilot-blue);}' +
        '.fb-status.err{color:#F87171;}' +
        '.fb-shipped{list-style:none;margin:0.25rem 0 0;padding:0;}' +
        '.fb-shipped li{position:relative;padding-left:1.4rem;margin-bottom:0.35rem;font-size:0.88rem;color:var(--text-secondary);}' +
        '.fb-shipped li:before{content:"\\2713";position:absolute;left:0;color:#34D399;font-weight:700;}';

    function injectCss() { if ($('fb-style')) return; var s = document.createElement('style'); s.id = 'fb-style'; s.appendChild(document.createTextNode(CSS)); (document.head || document.documentElement).appendChild(s); }
    function val(id) { var e = $(id); return e ? trim(e.value) : ''; }

    function wire() {
        var view = $('fbView'); if (!view) return;
        injectCss();
        var report = view.getAttribute('data-report') || 'Report';
        var version = view.getAttribute('data-version') || '';
        var openIds = (view.getAttribute('data-open') || 'btnFeedback').split(',');
        var backId = view.getAttribute('data-back') || 'fbBack';
        var sections = (view.getAttribute('data-sections') || '').split(',');
        var vis = {};

        function show() {
            var i, id, e;
            for (i = 0; i < sections.length; i++) { id = trim(sections[i]); if (!id) continue; e = $(id); if (e) { vis[id] = e.hidden; e.hidden = true; } }
            view.hidden = false; window.scrollTo(0, 0);
        }
        function hide() {
            view.hidden = true;
            var i, id, e;
            for (i = 0; i < sections.length; i++) { id = trim(sections[i]); if (!id) continue; e = $(id); if (e) e.hidden = (vis[id] === undefined) ? false : vis[id]; }
            window.scrollTo(0, 0);
        }

        var i, ob;
        for (i = 0; i < openIds.length; i++) { ob = $(trim(openIds[i])); if (ob) ob.addEventListener('click', function (e) { if (e && e.preventDefault) e.preventDefault(); show(); }); }
        var bb = $(backId); if (bb) bb.addEventListener('click', function (e) { if (e && e.preventDefault) e.preventDefault(); hide(); });

        view.addEventListener('click', function (e) {
            var c = e.target && e.target.closest ? e.target.closest('[data-chip]') : null; if (!c) return;
            var d = $('fbDesc'); if (!d) return;
            var t = c.getAttribute('data-chip');
            var cur = trim(d.value);
            d.value = cur ? (cur + '\n' + t) : t;
            d.focus();
        });

        function isEmail(s) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s); }
        function validate() {
            var errs = [];
            if (!val('fbName')) errs.push('first name');
            if (!isEmail(val('fbEmail'))) errs.push('a valid email');
            if (!val('fbOrg')) errs.push('organisation');
            if (!val('fbDesc')) errs.push('a description');
            return errs;
        }
        function compose() {
            var lines = [];
            lines.push('Report: ' + report + (version ? (' (' + version + ')') : ''));
            lines.push('From: ' + val('fbName') + '  <' + val('fbEmail') + '>');
            lines.push('Organisation: ' + val('fbOrg'));
            lines.push('Type: ' + val('fbCat') + '  |  Priority: ' + val('fbPri'));
            lines.push('');
            lines.push('Request:');
            lines.push(val('fbDesc'));
            lines.push('');
            lines.push('Sent from the in-report Request-a-change form (client-side; no API / no live submit).');
            return lines.join('\n');
        }
        function status(msg, isErr) { var s = $('fbStatus'); if (!s) return; s.textContent = msg; s.className = 'fb-status' + (isErr ? ' err' : ''); setTimeout(function () { if (s.textContent === msg) s.textContent = ''; }, 5000); }
        function fallbackCopy(text) {
            var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(ta); status(ok ? 'Copied to clipboard' : 'Copy failed - please select and copy manually');
        }
        var cp = $('fbCopy'); if (cp) cp.addEventListener('click', function () {
            var errs = validate(); if (errs.length) { status('Please add ' + errs.join(', ') + '.', true); return; }
            var text = compose();
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { status('Copied to clipboard'); }, function () { fallbackCopy(text); }); }
            else fallbackCopy(text);
        });
        var em = $('fbEmailBtn'); if (em) em.addEventListener('click', function () {
            var errs = validate(); if (errs.length) { status('Please add ' + errs.join(', ') + '.', true); return; }
            var to = view.getAttribute('data-email') || '';
            window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent('Change request: ' + report) + '&body=' + encodeURIComponent(compose());
        });

        // Microsoft Form (reliable, tracked capture). Injected only when a form URL is configured.
        var formUrl = trim(view.getAttribute('data-form') || '');
        if (formUrl) {
            var actions = cp ? cp.parentNode : (em ? em.parentNode : null);
            if (actions) {
                if (cp) cp.className = 'btn-secondary';
                var ff = document.createElement('button');
                ff.type = 'button'; ff.id = 'fbFormBtn'; ff.className = 'btn-primary';
                ff.textContent = 'Submit via Microsoft Form';
                actions.insertBefore(ff, actions.firstChild);
                ff.addEventListener('click', function () {
                    var errs = validate(); if (errs.length) { status('Please add ' + errs.join(', ') + '.', true); return; }
                    var text = compose();
                    function go() { window.open(formUrl, '_blank'); status('Copied - paste your request into the form and submit.'); }
                    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(go, function () { fallbackCopy(text); window.open(formUrl, '_blank'); }); }
                    else { fallbackCopy(text); window.open(formUrl, '_blank'); }
                });
            }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
