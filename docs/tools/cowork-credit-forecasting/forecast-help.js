(() => {
  "use strict";
  const fieldHelp = {
    horizon: ["How many months to include in the forecast.", "The total includes months 1 through the selected length."],
    startMonth: ["The first calendar month in your forecast."],
    currentMonth: ["The month you are currently reviewing.", "Use 0 if the forecast has not started."],
    initialUsers: ["People expected to use credits at the start.", "Monthly user growth is applied to this number. Department assumptions replace this aggregate input."],
    avgCredits: ["Starting monthly credits per user.", "Find it at aka.ms/copilotdashboard → Consumption Dashboard → Explore service insights.", "For imported data: credits used divided by users with data."],
    userGrowth: ["Expected change in users each month, starting in month 1.", "Users are rounded to whole people and never decrease from growth. A schedule entry for a month replaces the result, and Max allowed users caps it."],
    usageGrowth: ["Expected monthly change in credits per user, separate from user growth.", "Growth starts in month 2: month 1 uses your starting credits per user."],
    fundingMode: ["Choose whether unused prepaid credits carry forward or reset each month.", "Confirm the rules in your agreement; this is a planning choice."],
    openingPool: ["Credits you already hold when the forecast starts.", "The model uses these before pay-as-you-go credits."],
    monthlyAllocation: ["Prepaid credits available at the start of each month.", "Used only when credits reset monthly; unused credits do not carry forward."],
    prepaidRate: ["Your assumed price for one prepaid credit.", "Use the same currency for both prices and your budget."],
    paygRate: ["Your assumed pay-as-you-go price for one credit.", "Use the same currency for both prices and your budget."],
    budget: ["Your budget for the full forecast period.", "Compared with the estimated cost of credits used, not purchase payments."],
    currency: ["Choose the currency for the budget and prices.", "Changing the currency changes the displayed symbol only; it does not convert your amounts."],
    userCap: ["The ceiling for total users. Required when user growth is above 0.", "Without a ceiling, compounding growth would continue indefinitely."],
    growthMode: ["Choose one rate for the whole forecast or different rates by phase.", "Phase rates carry the previous month's users and usage forward."],
    "prepaid.mode": ["Choose whether unused prepaid credits carry forward or reset each month."],
    "prepaid.amount": ["Prepaid credits available at the start or each month, depending on your selection."],
    checkpoints: ["Months when you want to review the plan.", "Separate month numbers with commas."],
    sensitivity: ["Low and high subtract or add these percentage points to each phase's monthly usage growth; base is unchanged.", "These are scenarios, not predictions or confidence intervals."],
    "scheduled-sensitivity": ["Low and high subtract or add these percentage points to monthly usage growth, including each in-period phase.", "All other assumptions stay the same; these are scenarios, not predictions or confidence intervals.", "An adjusted rate below −100% is invalid."],
    "scheduled-chart-view": ["Switch between monthly forecast demand, sensitivity scenarios and a chronological monthly demand waterfall.", "Only the demand view includes imported actuals."],
    "scheduled-show-low": ["Show or hide the low scenario in the chart, table and selected PowerPoint sensitivity view.", "Monthly usage growth is reduced by the selected percentage points; other assumptions are unchanged.", "This is a scenario, not a prediction or probability."],
    "scheduled-show-base": ["Show or hide the base scenario in the chart, table and selected PowerPoint sensitivity view.", "It uses the current plan's monthly usage growth and other assumptions unchanged.", "This is a scenario, not a prediction or probability."],
    "scheduled-show-high": ["Show or hide the high scenario in the chart, table and selected PowerPoint sensitivity view.", "Monthly usage growth is increased by the selected percentage points; other assumptions are unchanged.", "This is a scenario, not a prediction or probability."],
    owner: ["The person responsible for reviewing the checkpoint."],
    trigger: ["The condition that should prompt a review."],
    response: ["The action you might take after reviewing the checkpoint."]
  };
  const rowHelp = {
    "steps.month": ["The forecast month when the new user total takes effect."],
    "steps.users": ["The total number of users in this month, not the number added.", "The maximum user limit still applies."],
    "purchases.month": ["The forecast month when purchased credits become available before usage.", "Purchases are saved but excluded in monthly-reset mode or outside the forecast."],
    "purchases.credits": ["Credits added to the prepaid balance at the start of this month in carry-forward mode."],
    "phases.label": ["A name to help you identify this phase."],
    "phases.month": ["The forecast month when this phase's growth rates begin."],
    "phases.userGrowth": ["Monthly change in users during this phase.", "The previous month's ending users carry forward."],
    "phases.usageGrowth": ["Monthly change in credits per user during this phase.", "Usage carries forward rather than resetting."],
    "departments.name": ["Name an explicitly defined, non-overlapping group.", "Groups share the plan's prepaid credits and budget."],
    "departments.startingUsers": ["The group's starting users; group totals replace the aggregate starting users.", "Imported data does not supply a department split."],
    "departments.startingCreditsPerUser": ["Starting monthly credits per user for this group.", "The aggregate starting usage is weighted by group users."],
    "phase.label": ["A name to help you identify this phase."],
    "phase.startMonth": ["The forecast month when this phase begins."],
    "phase.userGrowth": ["Monthly growth in active users during this phase.", "Active users are limited by enabled users."],
    "phase.usageGrowth": ["Monthly growth in credits per active user during this phase."],
    "phase.addedEnabled": ["Additional people enabled at the start of this phase.", "Limited by the number not yet enabled."],
    "phase.activationRate": ["Percentage of newly enabled people assumed to use credits immediately."],
    "department.name": ["Name of the group you want to model."],
    "department.eligible": ["People who could be enabled in this group."],
    "department.enabled": ["People already enabled in this group.", "Cannot exceed eligible people."],
    "department.active": ["Enabled people currently using credits.", "Cannot exceed enabled people."],
    "department.avgCredits": ["Starting credits per active user per month."]
  };
  const labelHelp = {
    "Consumption ZIP or joined CSV": ["Choose a Viva Insights Consumption query ZIP or a CSV with usage and organization fields.", "The file stays in this browser session."],
    "View by": ["Choose the field used to select a group, such as organization or cost center."],
    "Choose a group": ["Filter the history and forecast starting point to this group."],
    "Also break down by": ["Show results separately for values of this field.", "A person can appear in more than one group."],
    "Starting month": ["Choose the month whose credits and users will start your forecast.", "The forecast begins in the following month."],
    "How should users and usage grow?": ["Keep Modeling rates, use changes from the previous calendar month, or choose fictional phases in the demo.", "User growth changes users; usage growth changes credits per user. Observed changes are assumptions, not predictions."],
    "Numeric date order": ["Choose how dates like 01/02/2026 should be read.", "ISO dates use year-month-day."],
    "Metadata historical ID column": ["Choose the matching ID used to connect usage rows with organization details."],
    "Import actuals CSV": ["Choose a CSV with month, credits, cost and active users.", "Imported actuals remain separate from forecast totals."],
    "Import scenarios JSON": ["Open a previously exported scenario file.", "This replaces the current scenarios in this tab."],
    "Import monthly actuals CSV": ["Choose a CSV with month, credits, cost and active users."],
    "What decision are you discussing? (optional)": ["Add the question or decision your team needs to discuss.", "The text is included in the exported PowerPoint and scenario file."],
    "Usage-growth adjustment (percentage points)": fieldHelp.sensitivity,
    "Owner": fieldHelp.owner, "Trigger": fieldHelp.trigger, "Response": fieldHelp.response
  };
  const columnHelp = {
    Date: ["The date or month that the usage row covers.", "Choose a date order if your file uses numeric dates."],
    Credits: ["The Microsoft 365 Copilot credits used in each row.", "GitHub AI credits are a separate credit type."],
    Person: ["The person identifier used to count distinct people in each month.", "A person with several rows is counted once per month."],
    "Historical ID": ["The ID that links usage rows to people and organization details."],
    "Service ID": ["Identifies the service that used the credits."],
    "Service name": ["Names the service that used the credits.", "You can use it to filter your forecast."],
    "Policy ID": ["Identifies the spending policy associated with the usage."],
    Organization: ["The organization or business unit in your file.", "You can also use other supplied columns as groups."]
  };
  const exportHelp = {
    trend: ["Include a monthly demand view in the PowerPoint.", "Imported actuals, saved-plan overlays and checkpoint markers are not included in this view."],
    sensitivity: ["Include the selected low, base and high usage-growth scenarios in the PowerPoint.", "Low and high adjust monthly usage growth by the selected percentage points; they are not predictions."],
    phases: ["Include the chronological monthly demand waterfall in the PowerPoint.", "Each period's change is its ending-month forecast minus the previous period's ending demand, starting with the configured input. It includes all growth, steps and the user cap; it is not a causal breakdown."],
    checkpoints: ["Include checkpoint details in the PowerPoint.", "These are planning notes, not automated alerts."],
    departments: ["Include the department forecast view in the PowerPoint.", "It uses explicit department assumptions and shared plan funding, not an inferred split of imported history."]
  };
  const chartHelp = {
    demand: ["Show monthly forecast credit demand.", "Imported actuals and a comparable saved plan can appear separately; review checkpoints are marked."],
    sensitivity: ["Show monthly low, base and high usage-growth scenarios.", "Use the adjustment and checkboxes to control the scenarios; they are not predictions."],
    phases: ["Show starting monthly demand, each chronological period's change, and final monthly forecast demand.", "Starting demand is configured users × credits per user, or the sum across explicit departments; it may differ from selected historical data. Each change is the ending-month forecast minus the previous period's ending demand (the first uses starting demand). It includes all user and usage growth, steps and the user cap; it is not a causal breakdown."]
  };
  const checkpointHelp = {
    month: ["Forecast month for this review point, from 1 to 36; each checkpoint month must be unique.", "Months outside the forecast are saved but not shown; no alert is created."],
    owner: ["Optional person responsible for reviewing this checkpoint.", "This is a planning note, not an automated notification."],
    trigger: ["Optional condition that should prompt a review.", "This note does not automatically monitor the condition."],
    response: ["Optional action to consider after reviewing this checkpoint.", "This note does not change the forecast."]
  };
  const outputHelp = {
    "Credits needed": ["Sum of the monthly forecast credits for the selected period.", "Monthly credits = forecast users × credits per user."],
    "Estimated cost of credits used": ["Prepaid credits used × prepaid price, plus pay-as-you-go credits × pay-as-you-go price.", "This is not necessarily the amount paid during the period."],
    "Budget left / over budget": ["Budget minus estimated cost of credits used.", "A negative number means the estimate is above the budget; it does not stop spending."],
    "Pay-as-you-go credits needed": ["Credits needed after the available prepaid credits are used.", "Whether pay-as-you-go is actually available depends on your configuration."],
    "Month": ["A forecast month number or the calendar month shown in the data."],
    "Date": ["The calendar month covered by this row."],
    "Credits": ["Credits recorded for this month and selected group.", "Different services may be included unless filtered."],
    "Distinct users": ["People with at least one row in the selected month.", "A row does not necessarily mean positive credit usage."],
    "Credits per user": ["Credits divided by distinct users with data for the month."],
    "Credit growth MoM": ["(This month's credits − previous month's credits) ÷ previous month's credits.", "Blank when the prior calendar month is missing or has zero credits."],
    "User growth MoM": ["(This month's users − previous month's users) ÷ previous month's users.", "Blank when the previous calendar month is missing or has zero users."],
    "Completeness": ["Shows whether you confirmed that this month's data is complete.", "Dates alone do not establish completeness."],
    "Prepaid credits at start": ["Credits carried into this month.", "For monthly reset, this starts at zero."],
    "Credits purchased": ["Additional prepaid credits made available at the start of this month in carry-forward mode.", "Scheduled purchases are excluded in monthly-reset mode."],
    "Credits available": ["Starting prepaid balance plus purchases, or the monthly amount when it resets."],
    "Prepaid credits used": ["The smaller of credits needed and prepaid credits available."],
    "Prepaid credits left": ["Credits available minus prepaid credits used.", "Monthly reset amounts do not carry forward."],
    "Estimated prepaid cost": ["Prepaid credits used × assumed prepaid price."],
    "Estimated pay-as-you-go cost": ["Pay-as-you-go credits needed × assumed pay-as-you-go price."],
    "Estimated cost to date": ["Sum of estimated monthly costs through this month."],
    "New total users": ["The total users for this forecast month, not the number added."],
    "Starting credits per user per month": fieldHelp.avgCredits,
    "Starting users": fieldHelp.initialUsers,
    "Month 1–36": ["The forecast month when this change takes effect.", "Months after the selected forecast length are not included."],
    "Label": ["The name you give this phase."],
    "Start month": ["The forecast month when this phase begins."],
    "User growth % / month": ["The expected monthly change in users for this phase."],
    "Usage growth % / month": ["The expected monthly change in credits per user for this phase."],
    "Baseline date": ["The calendar month in your saved plan."],
    "Baseline users": ["Forecast users in the saved plan for this month."],
    "Baseline credits": ["Forecast credits in the saved plan for this month."],
    "Baseline cost": ["Estimated cost of credits used in the saved plan for this month."],
    "Alternative date": ["The calendar month in the current plan."],
    "Phase": ["The growth phase applied in this forecast month."],
    "Users": ["The forecast number of users after growth, steps and the maximum user limit."],
    "Credits / user": ["Forecast monthly credits per user.", "For the whole plan with departments, this is weighted by forecast users; it is unavailable when there are no users."],
    "Alternative credits": ["Forecast users × forecast credits per user in the current plan."],
    "Alternative cost": ["Estimated cost of prepaid and pay-as-you-go credits used in the current plan."],
    "Forecast credits": ["Forecast users × forecast credits per user in this month."],
    "Estimated cost": ["Estimated prepaid cost plus pay-as-you-go cost for credits used in this month.", "This may differ from when you pay for the credits."],
    "Saved plan date": ["The calendar month in your saved comparison plan."],
    "Saved plan users": ["Forecast users in your saved comparison plan for this month."],
    "Saved plan credits": ["Forecast credits in your saved comparison plan for this month."],
    "Saved plan cost": ["Estimated cost of credits used in your saved comparison plan for this month."],
    "Actual credits": ["Credits from the imported actuals file, shown separately from the forecast."],
    "Actual cost": ["Cost from the imported actuals file, shown separately from the forecast."],
    "Actual users": ["Users from the imported actuals file, shown separately from the forecast."],
    "What changes": ["The decision measure being compared across the two plans."],
    "Difference": ["Current plan minus saved plan.", "Not calculated when the plans cover different periods or data selections."],
    "Owner": checkpointHelp.owner,
    "Trigger": checkpointHelp.trigger,
    "Response": checkpointHelp.response,
    "Owner (optional)": checkpointHelp.owner,
    "Trigger (optional)": checkpointHelp.trigger,
    "Response (optional)": checkpointHelp.response,
    "Department": ["An explicitly modeled group; groups share the plan's prepaid credits and budget.", "Prepaid credits are allocated in proportion to group demand."],
    "Starting credits / user": rowHelp["departments.startingCreditsPerUser"],
    "Horizon credits": ["Sum of forecast credits across the full forecast period."],
    "Low credits": ["Monthly forecast credits with usage growth reduced by the selected percentage points.", "Other assumptions are unchanged; this is not a prediction."],
    "Base credits": ["Monthly forecast credits using the current plan unchanged.", "This is a scenario, not a prediction."],
    "High credits": ["Monthly forecast credits with usage growth increased by the selected percentage points.", "Other assumptions are unchanged; this is not a prediction."],
    "Sequential component": ["The first growth rates held throughout, each later phase in order, and the final forecast.", "Each phase compares its scenario with the preceding one."],
    "Final-month credits": ["For each phase, the change in final-month credits from adding that phase.", "The first and last rows are totals rather than changes."],
    "Running forecast credits": ["Final-month forecast credits after applying each phase in sequence."],
    "Cumulative credits": ["Sum of monthly forecast credits across the full horizon."],
    "Cost if all credits were pay-as-you-go": ["Total forecast credits multiplied by the assumed pay-as-you-go price."],
    "Estimated difference vs pay-as-you-go": ["All-pay-as-you-go cost minus estimated cost of credits used.", "A negative result means the modeled prepaid mix costs more."],
    "Budget left": ["Horizon budget minus estimated cost of credits used."],
    "Amount over budget": ["Horizon budget minus estimated cost of credits used; a negative amount is over budget.", "This does not stop spending."],
    "First month prepaid credits run out": ["First month a positive available prepaid amount is fully used.", "In reset mode credits can become available again next month."],
    "First month over budget": ["First month cumulative estimated cost exceeds the horizon budget.", "This does not stop spending."],
    "Eligible at horizon": ["People eligible to be enabled at the end of the forecast."],
    "Enabled at horizon": ["People enabled by the end of the forecast, limited by eligibility."],
    "Active at horizon": ["Enabled people forecast to use credits in the final month."],
    "Current month cost · currency": ["Estimated cost of credits used in the chosen current month, in your assumed currency.", "Month 0 is before rollout."],
    "Credits difference": ["Alternative horizon credits minus baseline horizon credits.", "Different forecast lengths cover different periods."],
    "Estimated cost difference": ["Alternative estimated cost of credits used minus baseline cost.", "Different forecast lengths cover different periods."],
    "Budget left difference": ["Alternative budget left minus baseline budget left.", "Changes can reflect both budget and cost differences."],
    "Pay-as-you-go credits difference": ["Alternative pay-as-you-go credits minus baseline pay-as-you-go credits."],
    "Alternative phase": ["The phase applied to the alternative forecast in this month."],
    "Monthly budget": ["Horizon budget divided evenly across forecast months for comparison."],
    "Monthly headroom": ["Monthly budget minus estimated cost of credits used in this month."],
    "Prepaid credits": ["Prepaid credits used, allocated across departments in proportion to demand."],
    "PAYG credits": ["Forecast demand not covered by available prepaid credits."],
    "Alternative active": ["Forecast active users in the alternative plan for this month."],
    "Actual active": ["Active users from the imported actuals file, separate from forecasts."],
    "Scenario": ["Low and high adjust usage growth by the selected percentage points; base uses the alternative unchanged.", "These are scenarios, not predictions."],
    "Usage-growth adjustment": ["Percentage points added to or subtracted from each phase's monthly usage growth."],
    "Horizon cost": ["Estimated cost of credits used across the full forecast period, in the assumed currency."],
    "Horizon headroom": ["Horizon budget minus estimated cost of credits used."],
    "Note": ["Validation details when the scenario's adjusted assumptions are invalid."],
    "Cost · currency": ["Estimated cost of credits used in the assumed currency."],
    "Optional name": ["Optional phase name; a blank name becomes Phase N."],
    "Active user growth / month %": rowHelp["phase.userGrowth"],
    "Usage / active user growth / month %": rowHelp["phase.usageGrowth"],
    "Newly enabled at start": rowHelp["phase.addedEnabled"],
    "New cohort activation %": rowHelp["phase.activationRate"],
    "Eligible": rowHelp["department.eligible"],
    "Enabled": rowHelp["department.enabled"],
    "Active": rowHelp["department.active"],
    "Credits / active user / month": rowHelp["department.avgCredits"]
  };
  const tip = document.createElement("div");
  tip.className = "forecast-tooltip";
  tip.id = "forecast-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  let active = null;
  function show(icon) {
    const text = icon._helpLines;
    if (!text) return;
    active = icon;
    const ul = document.createElement("ul");
    text.forEach(line => { const li = document.createElement("li"); li.textContent = line; ul.append(li); });
    tip.replaceChildren(ul); tip.hidden = false;
    const rect = icon.getBoundingClientRect();
    const width = tip.offsetWidth, height = tip.offsetHeight;
    let left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    let top = rect.top - height - 8;
    if (top < 8) top = Math.min(window.innerHeight - height - 8, rect.bottom + 8);
    tip.style.left = `${left}px`; tip.style.top = `${Math.max(8, top)}px`;
    icon.setAttribute("aria-expanded", "true");
  }
  function hide() {
    if (active) active.setAttribute("aria-expanded", "false");
    active = null; tip.hidden = true;
  }
  function icon(lines, name) {
    const i = document.createElement("span");
    i.className = "forecast-help"; i.textContent = "i"; i.tabIndex = 0;
    i.setAttribute("role", "button"); i.setAttribute("aria-label", `About ${name}`);
    i.setAttribute("aria-describedby", "forecast-tooltip"); i.setAttribute("aria-expanded", "false");
    i._helpLines = lines;
    i.addEventListener("mouseenter", () => show(i));
    i.addEventListener("mouseleave", () => { if (document.activeElement !== i) hide(); });
    i.addEventListener("focus", () => show(i));
    i.addEventListener("blur", hide);
    i.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); show(i); });
    i.addEventListener("keydown", e => { if (e.key === "Escape") { hide(); i.blur(); } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); active === i && !tip.hidden ? hide() : show(i); } });
    return i;
  }
  function labelText(node) {
    return Array.from(node.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join("").trim();
  }
  function attachInput(input) {
    if (input.dataset.helpAttached || input.type === "hidden") return;
    const key = input.dataset.scheduledField || input.dataset.field || input.id;
    const row = input.dataset.scheduledRow ? `${input.dataset.scheduledRow}.${input.dataset.rowKey}` : input.dataset.kind ? `${input.dataset.kind}.${input.dataset.key}` : "";
    const label = input.closest("label");
    const text = (label && labelText(label)) || input.getAttribute("aria-label") || input.dataset.rowKey || input.dataset.key || "field";
    let lines = input.dataset.checkpointKey ? checkpointHelp[input.dataset.checkpointKey]
      : input.dataset.targetGroup !== undefined ? ["Total users targeted for this department at this rollout step, not users added.", "Every department needs a target; targets must sum to the step's total, even outside the forecast. The shared user cap still applies."]
      : input.dataset.exportView ? exportHelp[input.dataset.exportView]
      : rowHelp[row] || fieldHelp[key] || labelHelp[text];
    if (!lines && label && label.closest("#data-panel") && input.type === "checkbox") {
      if (/^\d{4}-\d{2}: (?:complete|unknown)$/.test(text))
        lines = ["Mark this month complete only if you know the data covers the full month.", "The demo's completeness is fixed; dates alone do not prove coverage."];
      else if (text.startsWith("I understand the selected month"))
        lines = ["Acknowledge that incomplete selected or comparison months can distort the forecast.", "Required before forecasting this selection when coverage is uncertain."];
    }
    if (!lines && label && label.closest("#data-panel")) {
      const match = /^(Date|Credits|Person|Historical ID|Service ID|Service name|Policy ID|Organization) \((?:required|optional)\)/.exec(text);
      if (match) lines = [...columnHelp[match[1]], text.includes("(optional)") ? "Optional: choose Ignore to exclude matching metric columns unless mapped elsewhere." : "Required: select the corresponding column in your file."];
    }
    if (!lines) return;
    input.dataset.helpAttached = "1";
    if (label && text && !input.hasAttribute("aria-label")) input.setAttribute("aria-label", text);
    const i = icon(lines, text || key || "field");
    if (label) {
      let head = label.querySelector(":scope > .forecast-help-heading");
      if (!head) {
        head = document.createElement("span"); head.className = "forecast-help-heading";
        Array.from(label.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => head.append(n));
        label.insertBefore(head, label.firstChild);
      }
      head.append(i);
    } else {
      const wrapper = document.createElement("span"); wrapper.className = "forecast-help-input";
      input.parentNode.insertBefore(wrapper, input); wrapper.append(input, i);
    }
  }
  function attachOutput(node) {
    if (node.dataset.helpAttached) return;
    const text = node.textContent.trim();
    if (!text) return;
    let lines;
    if (node.closest("#data-panel") && node.cellIndex === 0 && node.closest("table")?.querySelector("th:nth-child(2)")?.textContent.includes("credits / users"))
      lines = ["Values of the selected breakdown field within the selected group.", "Distinct people can appear in multiple groups and are not additive."];
    else if (text === "Name" && node.closest("#scheduled-department-editor")) lines = rowHelp["departments.name"];
    else if (text === "Name" && node.closest("#legacy-app")) lines = rowHelp["department.name"];
    else if (text === "Starting users" && node.closest("#scheduled-department-editor")) lines = rowHelp["departments.startingUsers"];
    else if (text === "Month" && node.closest("table")?.querySelector("#scheduled-checkpoints")) lines = checkpointHelp.month;
    else if (text === "Credits needed" && node.closest("#scheduled-funding")) lines = ["Forecast users × credits per user for this month.", "This is the month's demand before prepaid and pay-as-you-go are split."];
    else if (text === "Credits" && node.closest("#department-totals")) lines = ["Sum of the group's forecast credits across the full horizon."];
    else lines = outputHelp[text];
    if (!lines && /(?:month|\d{4}-\d{2})/i.test(text) && /credits\s*\/\s*users/i.test(text))
      lines = ["Credits and distinct people for this group and month.", "People can appear in more than one group."];
    if (!lines && /^(Saved|Current) plan ·/.test(text))
      lines = [text.startsWith("Saved") ? "Totals and timing from the saved comparison plan." : "Totals and timing from the plan using current inputs.", "Costs estimate credits used in the selected currency, not purchase payments."];
    if (!lines) return;
    node.dataset.helpAttached = "1"; node.append(" ", icon(lines, text));
  }
  function update() {
    if (active && !active.isConnected) hide();
    document.querySelectorAll("main input, main select, main textarea").forEach(attachInput);
    document.querySelectorAll("main th, main .metric-label").forEach(attachOutput);
    document.querySelectorAll("#scheduled-app button[data-chart-view]").forEach(button => {
      const lines = chartHelp[button.dataset.chartView];
      if (!lines || button.dataset.helpAttached) return;
      button.dataset.helpAttached = "1";
      button.after(icon(lines, button.textContent.trim()));
    });
  }
  document.addEventListener("click", e => { if (active && !e.target.closest(".forecast-help")) hide(); });
  window.addEventListener("scroll", () => { if (active && active.isConnected) show(active); else hide(); }, true);
  window.addEventListener("resize", hide);
  const observer = new MutationObserver(update);
  observer.observe(document.querySelector("main"), { childList: true, subtree: true });
  update();
})();
