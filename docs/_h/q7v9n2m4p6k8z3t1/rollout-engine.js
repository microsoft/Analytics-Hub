/*
 * Plan (all fields required unless marked optional):
 * {horizon: integer 1..24, currentMonth?: integer 0..horizon (default 0),
 *  departments: [{name: unique nonempty string, eligible: number, enabled: number,
 *                 active: number, avgCredits: number}],
 *  phases: [{startMonth: integer, label: string, userGrowth: decimal,
 *            usageGrowth: decimal, addedEnabled: number, activationRate: decimal}],
 *  paygRate: number, prepaidRate: number,
 *  prepaid: {mode: "monthly"|"pool", amount: number},
 *  budget: number, checkpoints?: [integer month, ...]}.
 * Numbers are finite and nonnegative; active <= enabled <= eligible.
 * Growth decimals range from -1 (-100%) upward (1 means 100%);
 * activationRate is in [0,1]. Phases start at 1, strictly increase and fit
 * the horizon. Checkpoints are unique months within the horizon.
 *
 * Each forecast month applies the current phase's growth to prior active users
 * and per-user usage, including month 1.
 * At each phase start, after growth, addedEnabled is capped by aggregate
 * eligible-but-not-enabled capacity and distributed by department capacity;
 * activationRate of that newly enabled cohort becomes active immediately.
 * User growth is capped at enabled users. Rates retain continuity at boundaries.
 * Monthly prepaid renews each month; pool prepaid is shared across the horizon.
 * Only consumed prepaid is charged. Budget is a horizon total, spread evenly
 * for monthly comparisons; exhaustion is the first month cumulative cost EXCEEDS
 * that total. Prepaid exhaustion is the first month a positive allocation/pool
 * is fully consumed. currentMonth selects the current cumulative snapshot;
 * nextCheckpoint is the first checkpoint strictly after currentMonth.
 *
 * Result: {months, totals, departments, nextCheckpoint}. A month contains
 * {month, phase, phaseStartMonth, departments, eligible, enabled, active,
 * availableToEnable, inactiveEnabled, addedEnabled, credits, prepaidCredits,
 * paygCredits, prepaidCost, paygCost, cost, prepaidAvailable, prepaidRemaining,
 * budget, headroom, cumulative}. Its department rows additionally contain
 * name and avgCredits, but not budget, prepaid availability, or cumulative.
 * cumulative contains the six credit/cost fields plus horizon budget/headroom.
 * totals contains those cumulative fields, final capacity and prepaidRemaining,
 * budgetExhaustionMonth, prepaidExhaustionMonth, and current (a month result,
 * or a zero-cost baseline snapshot when currentMonth is 0). departments is
 * [{name, months: [department row], totals: {six credit/cost fields}}].
 * nextCheckpoint is a full month result or null. Exhaustion months are null
 * when not reached. All quantities retain JavaScript number precision.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ForecastEngine = factory();
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function finite(value, description) {
    if (!Number.isFinite(value)) {
      throw new Error("Numeric overflow while calculating " + description);
    }
    return value;
  }

  function add(a, b, description) {
    return finite(a + b, description);
  }

  function multiply(a, b, description) {
    return finite(a * b, description);
  }

  function sum(items, field, description) {
    return items.reduce(function (total, item) {
      return add(total, item[field], description);
    }, 0);
  }

  function validateFields(plan) {
    var errors = [];
    function number(value, path, max) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
          (max !== undefined && value > max)) {
        errors.push(path + " must be a finite nonnegative number" +
          (max !== undefined ? " no greater than " + max : ""));
        return false;
      }
      return true;
    }
    function integer(value, path, min, max) {
      if (!Number.isInteger(value) || value < min || value > max) {
        errors.push(path + " must be an integer from " + min + " to " + max);
        return false;
      }
      return true;
    }
    function growth(value, path) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < -1) {
        errors.push(path + " must be a finite number of at least -1");
      }
    }
    function object(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    if (!object(plan)) return ["plan must be an object"];
    var horizonValid = integer(plan.horizon, "horizon", 1, 24);
    if (plan.currentMonth !== undefined) {
      integer(plan.currentMonth, "currentMonth", 0, horizonValid ? plan.horizon : 24);
    }
    if (!Array.isArray(plan.departments) || plan.departments.length === 0) {
      errors.push("departments must be a nonempty array");
    } else {
      var names = Object.create(null);
      plan.departments.forEach(function (dept, index) {
        var path = "departments[" + index + "]";
        if (!object(dept)) {
          errors.push(path + " must be an object");
          return;
        }
        if (typeof dept.name !== "string" || !dept.name.trim()) {
          errors.push(path + ".name must be a nonempty string");
        } else if (names[dept.name.trim()]) {
          errors.push(path + ".name must be unique");
        } else {
          names[dept.name.trim()] = true;
        }
        var eligible = number(dept.eligible, path + ".eligible");
        var enabled = number(dept.enabled, path + ".enabled");
        var active = number(dept.active, path + ".active");
        number(dept.avgCredits, path + ".avgCredits");
        if (eligible && enabled && dept.enabled > dept.eligible) {
          errors.push(path + ".enabled cannot exceed eligible");
        }
        if (enabled && active && dept.active > dept.enabled) {
          errors.push(path + ".active cannot exceed enabled");
        }
      });
    }
    if (!Array.isArray(plan.phases) || plan.phases.length === 0) {
      errors.push("phases must be a nonempty array");
    } else {
      var previous = 0;
      plan.phases.forEach(function (phase, index) {
        var path = "phases[" + index + "]";
        if (!object(phase)) {
          errors.push(path + " must be an object");
          return;
        }
        var valid = integer(phase.startMonth, path + ".startMonth", 1,
          horizonValid ? plan.horizon : 24);
        if (valid) {
          if (index === 0 && phase.startMonth !== 1) {
            errors.push("phases must start at month 1");
          }
          if (phase.startMonth <= previous) {
            errors.push(path + ".startMonth must be strictly increasing and distinct");
          }
          previous = phase.startMonth;
        }
        if (typeof phase.label !== "string" || !phase.label.trim()) {
          errors.push(path + ".label must be a nonempty string");
        }
        growth(phase.userGrowth, path + ".userGrowth");
        growth(phase.usageGrowth, path + ".usageGrowth");
        number(phase.addedEnabled, path + ".addedEnabled");
        number(phase.activationRate, path + ".activationRate", 1);
      });
    }
    number(plan.paygRate, "paygRate");
    number(plan.prepaidRate, "prepaidRate");
    number(plan.budget, "budget");
    if (!object(plan.prepaid)) {
      errors.push("prepaid must be an object");
    } else {
      if (plan.prepaid.mode !== "monthly" && plan.prepaid.mode !== "pool") {
        errors.push('prepaid.mode must be "monthly" or "pool"');
      }
      number(plan.prepaid.amount, "prepaid.amount");
    }
    if (plan.checkpoints !== undefined) {
      if (!Array.isArray(plan.checkpoints)) {
        errors.push("checkpoints must be an array");
      } else {
        var seen = Object.create(null);
        plan.checkpoints.forEach(function (month, index) {
          if (integer(month, "checkpoints[" + index + "]", 1,
            horizonValid ? plan.horizon : 24)) {
            if (seen[month]) errors.push("checkpoints must contain distinct months");
            seen[month] = true;
          }
        });
      }
    }
    return errors;
  }

  // Sequential shares keep allocations bounded and assign the residual once.
  function allocate(amount, weights, totalWeight, description) {
    var remaining = amount;
    var remainingWeight = totalWeight;
    return weights.map(function (weight) {
      var share = remainingWeight > 0
        ? Math.min(weight, remaining, multiply(remaining, weight / remainingWeight, description))
        : 0;
      remaining = Math.max(0, remaining - share);
      remainingWeight = Math.max(0, remainingWeight - weight);
      return share;
    });
  }

  function calculate(plan) {
    var state = plan.departments.map(function (d) {
      return { name: d.name, eligible: d.eligible, enabled: d.enabled,
        active: d.active, avgCredits: d.avgCredits };
    });
    var departments = state.map(function (d) {
      return { name: d.name, months: [], totals: {
        credits: 0, prepaidCredits: 0, paygCredits: 0,
        prepaidCost: 0, paygCost: 0, cost: 0
      } };
    });
    var months = [];
    var cumulative = { credits: 0, prepaidCredits: 0, paygCredits: 0,
      prepaidCost: 0, paygCost: 0, cost: 0 };
    var current = null;
    var phaseIndex = 0;
    var poolRemaining = plan.prepaid.amount;
    var prepaidExhaustionMonth = null;
    var budgetExhaustionMonth = null;
    var monthlyBudget = plan.budget / plan.horizon;
    var fields = ["credits", "prepaidCredits", "paygCredits", "prepaidCost", "paygCost", "cost"];

    for (var month = 1; month <= plan.horizon; month++) {
      if (phaseIndex + 1 < plan.phases.length &&
          plan.phases[phaseIndex + 1].startMonth === month) phaseIndex++;
      var phase = plan.phases[phaseIndex];
      state.forEach(function (d) {
        // Avoid overflowing uncapped positive growth when the enabled cap binds.
        var room = d.enabled - d.active;
        var increment = d.active === 0 ? 0 :
          (phase.userGrowth >= 0 && phase.userGrowth >= room / d.active ? room :
            multiply(d.active, phase.userGrowth, "active user growth"));
        d.active = Math.max(0, Math.min(d.enabled, add(d.active, increment, "active users")));
        d.avgCredits = multiply(d.avgCredits, 1 + phase.usageGrowth, "per-user usage");
      });
      var available = state.map(function (d) { return d.eligible - d.enabled; });
      var availableTotal = available.reduce(function (a, b) {
        return add(a, b, "available eligible capacity");
      }, 0);
      var added = phase.startMonth === month ? Math.min(phase.addedEnabled, availableTotal) : 0;
      var additions = allocate(added, available, availableTotal, "enabled allocation");
      state.forEach(function (d, index) {
        d.enabled = Math.min(d.eligible, add(d.enabled, additions[index], "enabled users"));
        d.active = Math.min(d.enabled, add(d.active,
          multiply(additions[index], phase.activationRate, "cohort activation"), "active users"));
      });
      var credits = state.map(function (d) {
        return multiply(d.active, d.avgCredits, "department credits");
      });
      var totalCredits = credits.reduce(function (a, b) { return add(a, b, "monthly credits"); }, 0);
      var prepaidAvailable = plan.prepaid.mode === "monthly" ? plan.prepaid.amount : poolRemaining;
      var usedPrepaid = Math.min(totalCredits, prepaidAvailable);
      var shares = allocate(usedPrepaid, credits, totalCredits, "prepaid allocation");
      if (plan.prepaid.mode === "pool") poolRemaining = Math.max(0, poolRemaining - usedPrepaid);
      var prepaidRemaining = plan.prepaid.mode === "pool" ? poolRemaining :
        Math.max(0, prepaidAvailable - usedPrepaid);
      if (prepaidExhaustionMonth === null && prepaidAvailable > 0 && usedPrepaid >= prepaidAvailable) {
        prepaidExhaustionMonth = month;
      }
      var rows = state.map(function (d, index) {
        var paygCredits = Math.max(0, credits[index] - shares[index]);
        var prepaidCost = multiply(shares[index], plan.prepaidRate, "prepaid cost");
        var paygCost = multiply(paygCredits, plan.paygRate, "payg cost");
        var row = { month: month, name: d.name, eligible: d.eligible, enabled: d.enabled,
          active: d.active, availableToEnable: d.eligible - d.enabled,
          inactiveEnabled: d.enabled - d.active, avgCredits: d.avgCredits,
          addedEnabled: additions[index], credits: credits[index],
          prepaidCredits: shares[index], paygCredits: paygCredits,
          prepaidCost: prepaidCost, paygCost: paygCost,
          cost: add(prepaidCost, paygCost, "department cost") };
        departments[index].months.push(row);
        fields.forEach(function (field) {
          departments[index].totals[field] = add(departments[index].totals[field], row[field],
            "department cumulative " + field);
        });
        return row;
      });
      var result = { month: month, phase: phase.label, phaseStartMonth: phase.startMonth,
        departments: rows, eligible: sum(rows, "eligible", "eligible users"),
        enabled: sum(rows, "enabled", "enabled users"), active: sum(rows, "active", "active users"),
        availableToEnable: sum(rows, "availableToEnable", "available capacity"),
        inactiveEnabled: sum(rows, "inactiveEnabled", "inactive enabled users"),
        addedEnabled: sum(rows, "addedEnabled", "newly enabled users"),
        prepaidAvailable: prepaidAvailable, prepaidRemaining: prepaidRemaining,
        budget: monthlyBudget };
      fields.forEach(function (field) {
        result[field] = sum(rows, field, "monthly " + field);
        cumulative[field] = add(cumulative[field], result[field], "cumulative " + field);
      });
      result.headroom = finite(monthlyBudget - result.cost, "monthly budget headroom");
      result.cumulative = Object.assign({}, cumulative, {
        budget: plan.budget, headroom: finite(plan.budget - cumulative.cost, "budget headroom")
      });
      if (budgetExhaustionMonth === null && cumulative.cost > plan.budget) {
        budgetExhaustionMonth = month;
      }
      months.push(result);
      if (month === plan.currentMonth) current = result;
    }
    var last = months[months.length - 1];
    var initialEligible = sum(plan.departments, "eligible", "baseline eligible users");
    var initialEnabled = sum(plan.departments, "enabled", "baseline enabled users");
    var initialActive = sum(plan.departments, "active", "baseline active users");
    if (!current) {
      current = { month: 0, eligible: initialEligible, enabled: initialEnabled,
        active: initialActive, availableToEnable: initialEligible - initialEnabled,
        inactiveEnabled: initialEnabled - initialActive, prepaidRemaining: plan.prepaid.amount,
        cumulative: { credits: 0, prepaidCredits: 0, paygCredits: 0,
          prepaidCost: 0, paygCost: 0, cost: 0, budget: plan.budget, headroom: plan.budget } };
    }
    var checkpoints = (plan.checkpoints || []).slice().sort(function (a, b) { return a - b; });
    var next = checkpoints.find(function (m) { return m > (plan.currentMonth || 0); });
    return { months: months, totals: Object.assign({}, cumulative, {
      eligible: last.eligible, enabled: last.enabled, active: last.active,
      availableToEnable: last.availableToEnable, inactiveEnabled: last.inactiveEnabled,
      prepaidRemaining: last.prepaidRemaining, budget: plan.budget,
      headroom: finite(plan.budget - cumulative.cost, "total budget headroom"),
      budgetExhaustionMonth: budgetExhaustionMonth,
      prepaidExhaustionMonth: prepaidExhaustionMonth, current: current
    }), departments: departments, nextCheckpoint: next === undefined ? null : months[next - 1] };
  }

  function validatePlan(plan) {
    var errors = validateFields(plan);
    if (errors.length === 0) {
      try {
        calculate(plan);
      } catch (error) {
        errors.push(error.message);
      }
    }
    return errors;
  }

  function forecast(plan) {
    var errors = validatePlan(plan);
    if (errors.length) throw new Error("Invalid plan: " + errors.join("; "));
    return calculate(plan);
  }

  return { validatePlan: validatePlan, forecast: forecast };
}));
