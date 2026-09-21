# Cowork ROI Model — Feedback Applied

**Source:** Demo review "Cowork ROI Model — Demo impressions and recommendations" (prepared for Miles Sovell, 2026-09-17).
**Updated:** 2026-09-18
**Scope:** Internal seller-enablement tool. This document maps each recommendation from the original review to what was implemented in the app.

Status legend: ✅ Applied · 🟡 Partially applied · ⛔ Deferred · ➖ Out of scope (by request)

---

## P0 — Priority items

### P0.1 — Prevent double counting in the headline ✅ Applied
**Ask:** Don't add capacity value and downstream outcomes into one headline; show them side by side. Make the all-persona sum an explicitly labeled upper-bound scenario; default to a selected persona or validated scope.

**What changed:**
- The Combined view no longer sums the two numbers. The single additive grand total was **replaced with two side-by-side cards** — *Estimated capacity value* and *Modeled business impact* — each shown independently, with a "do not add them" caption.
- The all-persona × lever matrix total and the combined modeled scope are now **explicitly labeled "upper bound"** to flag cross-persona overlap.
- **Net Benefit/Cost** is shown against each of the two numbers separately, never blended.

**Known limitation (documented, not yet fixed):** intra-persona revenue lines can still share the same underlying revenue base. This is a third overlap layer parked as a documented limitation.

### P0.2 — Replace unsupported "measured" labels ✅ Applied
**Ask:** Use "estimated capacity value" for manually entered or research-derived figures; reserve "measured" for verified usage evidence.

**What changed:**
- Every "Measured" label was replaced with **"Estimated."** The capacity card is titled *Estimated capacity value (derived from usage)*; the badge, total row, and main intro were reworded accordingly.
- Zero occurrences of the word "measured" remain in the app.

### P0.3 — Clarify the financial measures 🟡 Partially applied
**Ask:** Label benefit-cost ratio separately from net ROI; expose annual credit and license costs, licensed-user population, and any implementation / change-management costs.

**What changed:**
- The old "ROI multiple" was renamed **Net Benefit/Cost** and the formula changed to **(benefits − costs) ÷ costs** on Tab 1 and both Combined headline cards.
- Tab 1 exposes the **monthly Copilot credit cost, loaded labor rate, users (MAU), and user subscription license (USL)**; the cost denominator is the annual credit + license cost.

**Not yet done:** a separately displayed benefit-cost ratio (we standardized on Net Benefit/Cost), and dedicated inputs for implementation / change-management costs.

### P0.4 — Prepopulate productivity measures from a template + company data 🟡 Partially applied (AI portion out of scope by request)
**Ask:** On the Time Savings tab, use the template model and company user count to generate default productivity measures; let users keep or replace them with actual usage; label estimates vs actuals. *(The user asked to ignore the AI-specific mechanism.)*

**What changed:**
- Added **"Import from a Cowork Value Story deck (.pptx)"** on Tab 1. It reads a customer's usage deck **entirely in the browser** and auto-fills **credit users (MAU)**, the **task breakdown by category**, and **credits consumed → dollars** (via an editable "$ per credit" assumption).
- These are the customer's **actual observed usage figures** from the deck, addressing the intent (prepopulate productivity measures from the provided model) without an AI generation step.

**Note:** the AI-generation approach itself was intentionally not implemented, per instruction.

---

## P1 — Secondary items

### P1.1 — Connect outcomes to feasible capacity and adoption ⛔ Deferred
**Ask:** Explain how recaptured hours, affected users, adoption, and time-to-value constrain persona benefits; add checks for implausible task volumes or savings above available working capacity.

**Status:** Not yet implemented. Guardrails for capacity/adoption and plausibility checks remain open.

### P1.2 — Make assumptions auditable 🟡 Partially applied
**Ask:** For each benefit show formula, units, source/date, population applicability, evidence quality; clarify whether the 15% risk adjustment is a multiplier or a reduction; add traceable low/base/high cases.

**What changed:**
- Each Time Savings bucket shows its **research source**; each business-impact factor shows an editable value with a **source note**.
- Tab 1 offers **Conservative / Mid / High research bands** (traceable low/base/high minutes).

**Not yet done:** explicit source **dates** and **evidence-quality** grading per line, population-applicability metadata, and clarifying the 15% risk adjustment as a retained-value multiplier vs a reduction.

### P1.3 — Align the interface with its caveats ✅ Applied
**Ask:** Move overlap and uncertainty warnings next to the headline; show selected vs included personas explicitly.

**What changed:**
- The overlap / "not added" / **upper-bound** warnings now sit **directly next to the two headline cards**, not buried below.
- The Combined view shows scope explicitly as **"(all N personas)"** or **"(X of N personas)"**, and the matrix highlights the active and excluded personas.

### P1.4 — Demonstrate privacy and reproducibility 🟡 Partially applied
**Ask:** Verify what leaves the device and what is stored; provide a reproducible scenario summary with assumptions, exclusions, version, and calculation definitions.

**What changed:**
- The new deck import is **fully client-side** — the .pptx is parsed in the browser and **nothing is uploaded**, which is stated in the UI. This strengthens the privacy story.

**Not yet done:** an exportable/reproducible scenario summary (assumptions, exclusions, version, calculation definitions).

---

## Related changes requested alongside the review

These were user-requested during the same effort (not line items in the review):

- **Annual Revenue field starts blank** (no baked-in company size); values show `$0` until entered.
- **All-persona × lever matrix** on the Combined view (personas × revenue / cost / risk).
- **Exclude / include toggles** for individual strategies and whole personas (reversible).
- **"Examples" button** per strategy revealing 2–3 sample Cowork workflows.
- **Removed hard company-size numbers** ($5B and derived figures) from assumption sub-headers.
- **Removed all BVA references**; reset button renamed to "Reset to defaults."

---

## Summary

| Item | Status |
|------|--------|
| P0.1 Prevent double counting | ✅ Applied |
| P0.2 Replace "measured" labels | ✅ Applied |
| P0.3 Clarify financial measures | 🟡 Partial |
| P0.4 Prepopulate from template/usage | 🟡 Partial (AI portion out of scope) |
| P1.1 Capacity & adoption guardrails | ⛔ Deferred |
| P1.2 Auditable assumptions | 🟡 Partial |
| P1.3 Align interface with caveats | ✅ Applied |
| P1.4 Privacy & reproducibility | 🟡 Partial |

All three **P0** headline-credibility concerns are addressed; the remaining open work is concentrated in the P1 auditability, capacity guardrails, and an exportable scenario summary.
