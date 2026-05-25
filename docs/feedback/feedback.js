/* ============================================================
   Analytics Hub · Feedback page logic
   - Type picker (problem | suggestion | praise)
   - Conditional praise fields with publish opt-in
   - Submit via mailto: (fallback: copy to clipboard)
   - Renders living reputation wall from ../data/testimonials.json
   ============================================================ */

(function () {
  "use strict";

  const RECIPIENT = "copilot-roi-advisory-team-gh@microsoft.com";

  const form        = document.getElementById("fb-form");
  const praiseBox   = document.getElementById("fb-praise-fields");
  const publishChk  = document.getElementById("fb-publish");
  const submitBtn   = document.getElementById("fb-submit");
  const copyBtn     = document.getElementById("fb-copy");
  const statusEl    = document.getElementById("fb-status");
  const wallGrid    = document.getElementById("fb-wall-grid");
  const wallEmpty   = document.getElementById("fb-wall-empty");

  const typeRadios  = form.querySelectorAll('input[name="type"]');
  const praiseQuote = document.getElementById("fb-quote-text");
  const praiseCompany = document.getElementById("fb-company");

  // ---------------------------------------------- Clarity helper
  function clarity(name, value) {
    try { window.clarity && window.clarity("event", name, value); } catch (_) {}
  }

  // ---------------------------------------------- Type-driven UI
  function selectedType() {
    for (const r of typeRadios) if (r.checked) return r.value;
    return "suggestion";
  }
  function syncTypeUI() {
    const t = selectedType();
    const isPraise = t === "praise";
    praiseBox.classList.toggle("is-open", isPraise);
    // Only require praise-specific fields when praise is chosen
    praiseQuote.required = isPraise;
    praiseCompany.required = isPraise;
    // Submit label
    submitBtn.querySelector(".fb-submit-label").textContent =
      isPraise ? "Send praise" : (t === "problem" ? "Report problem" : "Send suggestion");
  }
  typeRadios.forEach(r => r.addEventListener("change", syncTypeUI));
  syncTypeUI();

  // ---------------------------------------------- Build the email
  function buildEmail() {
    const type   = selectedType();
    const fd     = new FormData(form);
    const name   = (fd.get("name") || "").toString().trim();
    const email  = (fd.get("email") || "").toString().trim();
    const report = (fd.get("report") || "").toString().trim();
    const message = (fd.get("message") || "").toString().trim();

    const typeLabel = type === "problem" ? "Problem" : type === "praise" ? "Praise" : "Suggestion";
    const subject = `[Analytics Hub · ${typeLabel}] ${name || "Anonymous"}${report ? " — " + report : ""}`;

    const lines = [
      `Type: ${typeLabel}`,
      `Name: ${name || "(not provided)"}`,
      `Email: ${email || "(not provided)"}`,
      `Report / area: ${report || "(not specified)"}`,
      "",
      "Message:",
      message || "(empty)",
    ];

    if (type === "praise") {
      const quote    = (fd.get("quote") || "").toString().trim();
      const company  = (fd.get("company") || "").toString().trim();
      const role     = (fd.get("role") || "").toString().trim();
      const publish  = publishChk.checked ? "YES" : "NO";
      lines.push(
        "",
        "—— Praise details ——",
        `Company: ${company}`,
        `Role / title: ${role || "(not provided)"}`,
        `Publish on reputation wall: ${publish}`,
        "",
        "Quote (verbatim):",
        quote,
      );
    }

    lines.push(
      "",
      "——",
      `Submitted from: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
    );

    return { subject, body: lines.join("\n") };
  }

  // ---------------------------------------------- Submit (mailto)
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const { subject, body } = buildEmail();
    const mailto = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (mailto.length > 8000) {
      // mailto URI limit hit — fall back to copy
      copyToClipboard(subject, body);
      return;
    }

    statusEl.textContent = "Opening your email app…";
    statusEl.classList.remove("is-ok");
    window.location.href = mailto;

    setTimeout(() => {
      statusEl.textContent = "Email drafted. Press Send in your mail client to deliver.";
      statusEl.classList.add("is-ok");
    }, 600);

    clarity("Feedback submitted", selectedType());
  });

  // ---------------------------------------------- Copy fallback
  function copyToClipboard(subject, body) {
    const text = `To: ${RECIPIENT}\nSubject: ${subject}\n\n${body}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        statusEl.textContent = `Copied to clipboard — paste into an email to ${RECIPIENT}.`;
        statusEl.classList.add("is-ok");
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove();
    statusEl.textContent = `Copied — paste into an email to ${RECIPIENT}.`;
    statusEl.classList.add("is-ok");
  }
  copyBtn.addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const { subject, body } = buildEmail();
    copyToClipboard(subject, body);
    clarity("Feedback copied", selectedType());
  });

  // ---------------------------------------------- Reputation wall
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  fetch("../data/testimonials.json", { cache: "no-store" })
    .then(r => r.ok ? r.json() : { items: [] })
    .then(data => {
      const items = (data.items || []).filter(i => i && i.quote && i.company);
      if (!items.length) {
        wallGrid.style.display = "none";
        wallEmpty.style.display = "block";
        return;
      }
      wallEmpty.style.display = "none";
      wallGrid.innerHTML = items.map(i => `
        <article class="fb-quote">
          <blockquote>${escapeHtml(i.quote)}</blockquote>
          <div class="fb-quote-attrib">
            <strong>${escapeHtml(i.name || "—")}</strong>
            ${i.role ? `<div>${escapeHtml(i.role)}</div>` : ""}
            <div>${escapeHtml(i.company)}</div>
          </div>
          ${(i.report || i.date) ? `
            <div class="fb-quote-meta">
              ${i.report ? `<span class="fb-quote-tag">${escapeHtml(i.report)}</span>` : ""}
              ${i.date ? `<span class="fb-quote-tag">${escapeHtml(i.date)}</span>` : ""}
            </div>` : ""}
        </article>
      `).join("");
    })
    .catch(() => {
      wallGrid.style.display = "none";
      wallEmpty.style.display = "block";
    });
})();
