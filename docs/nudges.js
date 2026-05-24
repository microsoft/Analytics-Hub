/* ============================================================
   Analytics Hub · nudges.js
   ------------------------------------------------------------
   Tiny one-shot UX nudge module. Each nudge fires AT MOST ONCE
   ever per visitor (stored in localStorage `ah:nudge:<id>`).
   Honours prefers-reduced-motion: still highlights, no animation.

   Public API:
     ahNudge.pulse(selector, id, { duration = 6000, stopOnClick = true })
     ahNudge.toast(message, id, { anchor = 'top-right', duration = 4500 })

   Both are no-ops if the nudge has already fired or the target
   isn't present. Safe to call multiple times.
   ============================================================ */
(function () {
  if (window.ahNudge) return;

  const NS = "ah:nudge:";
  const seen = (id) => {
    try { return !!localStorage.getItem(NS + id); } catch { return false; }
  };
  const remember = (id) => {
    try { localStorage.setItem(NS + id, "1"); } catch {}
  };
  const reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // -------------------------------------------------- pulse a target
  function pulse(selector, id, opts = {}) {
    if (!id || seen(id)) return;
    const el = typeof selector === "string"
      ? document.querySelector(selector)
      : selector;
    if (!el) return;

    const duration   = opts.duration   ?? 6000;
    const stopOnClick = opts.stopOnClick ?? true;

    el.classList.add("ah-nudge-pulse");
    if (reducedMotion) el.classList.add("ah-nudge-pulse--static");
    remember(id);

    const stop = () => {
      el.classList.remove("ah-nudge-pulse", "ah-nudge-pulse--static");
      el.removeEventListener("click", stop, true);
      clearTimeout(timer);
    };
    if (stopOnClick) el.addEventListener("click", stop, true);
    const timer = setTimeout(stop, duration);
  }

  // -------------------------------------------------- floating toast
  function toast(message, id, opts = {}) {
    if (!id || seen(id)) return;
    const duration = opts.duration ?? 4500;
    const anchor   = opts.anchor   ?? "top-right";

    const el = document.createElement("div");
    el.className = `ah-nudge-toast ah-nudge-toast--${anchor}`;
    el.setAttribute("role", "status");
    el.innerHTML = `
      <span class="ah-nudge-toast__msg">${message}</span>
      <button class="ah-nudge-toast__close" aria-label="Dismiss">\u00d7</button>
    `;
    document.body.appendChild(el);
    remember(id);

    requestAnimationFrame(() => el.classList.add("is-shown"));

    const dismiss = () => {
      el.classList.remove("is-shown");
      setTimeout(() => el.remove(), 250);
    };
    el.querySelector(".ah-nudge-toast__close").addEventListener("click", dismiss);
    setTimeout(dismiss, duration);
  }

  window.ahNudge = { pulse, toast };
})();
