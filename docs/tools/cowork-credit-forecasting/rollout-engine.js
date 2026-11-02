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
 * There may be at most 200 departments. Numbers are finite and nonnegative;
 * active <= enabled <= eligible.
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
 * when not reached. Input numbers are interpreted by their decimal string
 * representation for calculation and returned quantities are JavaScript numbers.
 * Excessively complex exact calculations are rejected rather than approximated:
 * operands are limited to 8192 bits, with a bounded per-forecast work budget.
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

  function sum(items, field, description) {
    return items.reduce(function (total, item) {
      return add(total, item[field], description);
    }, 0);
  }

  // Interpret each input number by its decimal representation. Exact rational
  // arithmetic keeps threshold decisions distinct from binary float artifacts.
  var precisionBudget = null;
  var precisionSizes = [1n << 256n, 1n << 1024n, 1n << 4096n, 1n << 8192n];
  function withPrecisionBudget(calculateForecast, plan) {
    var previous = precisionBudget;
    precisionBudget = { calls: 0, work: 0 };
    try { return calculateForecast(plan); }
    finally { precisionBudget = previous; }
  }
  function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    if (precisionBudget) {
      var largest = a > b ? a : b;
      if (largest >= precisionSizes[3]) {
        throw new Error("Exact calculation exceeds the precision complexity limit; simplify the inputs");
      }
      var weight = largest < precisionSizes[0] ? 1 :
        largest < precisionSizes[1] ? 16 : largest < precisionSizes[2] ? 256 : 4096;
      precisionBudget.calls++;
      precisionBudget.work += weight;
      if (precisionBudget.calls > 500000 || precisionBudget.work > 16000000) {
        throw new Error("Exact calculation exceeds the precision complexity limit; simplify the inputs");
      }
    }
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }
  function rational(n, d) {
    if (n === 0n) return { n: 0n, d: 1n };
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function decimal(value) {
    var match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
    var digits = match[2] + (match[3] || "");
    var exponent = Number(match[4] || 0) - (match[3] || "").length;
    var n = BigInt(digits) * (match[1] ? -1n : 1n);
    return exponent >= 0 ? rational(n * 10n ** BigInt(exponent), 1n) :
      rational(n, 10n ** BigInt(-exponent));
  }
  function radd(a, b) {
    var g = gcd(a.d, b.d);
    var n = a.n * (b.d / g) + b.n * (a.d / g);
    var h = gcd(n, g);
    return { n: n / h, d: (a.d / g) * (b.d / h) };
  }
  function rsub(a, b) {
    var g = gcd(a.d, b.d);
    var n = a.n * (b.d / g) - b.n * (a.d / g);
    var h = gcd(n, g);
    return { n: n / h, d: (a.d / g) * (b.d / h) };
  }
  function rmul(a, b) {
    var g1 = gcd(a.n, b.d), g2 = gcd(b.n, a.d);
    return { n: (a.n / g1) * (b.n / g2), d: (a.d / g2) * (b.d / g1) };
  }
  function rdiv(a, b) { return rmul(a, { n: b.d, d: b.n }); }
  function rcmp(a, b) {
    var difference = a.n * b.d - b.n * a.d;
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
  }
  function rmin(a, b) { return rcmp(a, b) <= 0 ? a : b; }
  function rnumber(value, description) {
    if (value.n === 0n) return 0;
    var negative = value.n < 0n;
    var n = negative ? -value.n : value.n, d = value.d;
    var exponent = n.toString(2).length - d.toString(2).length;
    if (exponent >= 0 ? n < (d << BigInt(exponent)) :
      (n << BigInt(-exponent)) < d) exponent--;
    if (exponent > 1023) return finite(negative ? -Infinity : Infinity, description);
    if (exponent < -1075) return negative ? -0 : 0;
    var shift = exponent < -1022 ? 1074 : 52 - exponent;
    var numerator = shift >= 0 ? n << BigInt(shift) : n;
    var denominator = shift >= 0 ? d : d << BigInt(-shift);
    var significand = numerator / denominator;
    var remainder = numerator % denominator;
    if (remainder * 2n > denominator ||
        (remainder * 2n === denominator && significand % 2n === 1n)) significand++;
    var number = Number(significand) * Math.pow(2, exponent < -1022 ? -1074 : exponent - 52);
    return finite(negative ? -number : number, description);
  }
  function rsum(values) {
    return values.reduce(function (a, b) { return radd(a, b); }, decimal(0));
  }
  function rallocate(amount, weights, totalWeight) {
    var zero = decimal(0);
    if (rcmp(totalWeight, zero) === 0) return weights.map(function () { return zero; });
    return weights.map(function (weight) {
      return rdiv(rmul(amount, weight), totalWeight);
    });
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
    if (!Array.isArray(plan.departments) || plan.departments.length === 0 || plan.departments.length > 200) {
      errors.push("departments must be a nonempty array of at most 200 rows");
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

  function calculate(plan) {
    var state = plan.departments.map(function (d) {
      return { name: d.name, eligible: decimal(d.eligible), enabled: decimal(d.enabled),
        active: decimal(d.active), avgCredits: decimal(d.avgCredits) };
    });
    var departments = state.map(function (d) {
      return { name: d.name, months: [], totals: {
        credits: 0, prepaidCredits: 0, paygCredits: 0,
        prepaidCost: 0, paygCost: 0, cost: 0
      } };
    });
    var months = [];
    var zero = decimal(0), one = decimal(1);
    var cumulative = { credits: zero, prepaidCredits: zero, paygCredits: zero,
      prepaidCost: zero, paygCost: zero, cost: zero };
    var current = null;
    var phaseIndex = 0;
    var poolRemaining = decimal(plan.prepaid.amount);
    var prepaidExhaustionMonth = null;
    var budgetExhaustionMonth = null;
    var monthlyBudget = plan.budget / plan.horizon;
    var fields = ["credits", "prepaidCredits", "paygCredits", "prepaidCost", "paygCost", "cost"];

    for (var month = 1; month <= plan.horizon; month++) {
      if (phaseIndex + 1 < plan.phases.length &&
          plan.phases[phaseIndex + 1].startMonth === month) phaseIndex++;
      var phase = plan.phases[phaseIndex];
      state.forEach(function (d) {
        d.active = rmin(d.enabled, rmul(d.active, radd(one, decimal(phase.userGrowth))));
        d.avgCredits = rmul(d.avgCredits, radd(one, decimal(phase.usageGrowth)));
        rnumber(d.active, "active users");
        rnumber(d.avgCredits, "per-user usage");
      });
      var available = state.map(function (d) { return rsub(d.eligible, d.enabled); });
      var availableTotal = rsum(available);
      rnumber(availableTotal, "available eligible capacity");
      var added = phase.startMonth === month ? rmin(decimal(phase.addedEnabled), availableTotal) : zero;
      var additions = rallocate(added, available, availableTotal);
      state.forEach(function (d, index) {
        d.enabled = rmin(d.eligible, radd(d.enabled, additions[index]));
        d.active = rmin(d.enabled, radd(d.active, rmul(additions[index], decimal(phase.activationRate))));
        rnumber(d.enabled, "enabled users");
        rnumber(d.active, "active users");
      });
      var credits = state.map(function (d) {
        var value = rmul(d.active, d.avgCredits);
        rnumber(value, "department credits");
        return value;
      });
      var totalCredits = rsum(credits);
      rnumber(totalCredits, "monthly credits");
      var prepaidAvailable = plan.prepaid.mode === "monthly" ? decimal(plan.prepaid.amount) : poolRemaining;
      var usedPrepaid = rmin(totalCredits, prepaidAvailable);
      var shares = rallocate(usedPrepaid, credits, totalCredits);
      if (plan.prepaid.mode === "pool") poolRemaining = rsub(poolRemaining, usedPrepaid);
      var prepaidRemaining = plan.prepaid.mode === "pool" ? poolRemaining :
        rsub(prepaidAvailable, usedPrepaid);
      if (prepaidExhaustionMonth === null && rcmp(prepaidAvailable, zero) > 0 && rcmp(usedPrepaid, prepaidAvailable) >= 0) {
        prepaidExhaustionMonth = month;
      }
      var rows = state.map(function (d, index) {
        var paygCredits = rsub(credits[index], shares[index]);
        var prepaidCost = rmul(shares[index], decimal(plan.prepaidRate));
        var paygCost = rmul(paygCredits, decimal(plan.paygRate));
        var exact = { credits: credits[index], prepaidCredits: shares[index], paygCredits: paygCredits,
          prepaidCost: prepaidCost, paygCost: paygCost, cost: radd(prepaidCost, paygCost) };
        var row = { month: month, name: d.name, eligible: rnumber(d.eligible, "eligible users"),
          enabled: rnumber(d.enabled, "enabled users"), active: rnumber(d.active, "active users"),
          availableToEnable: rnumber(rsub(d.eligible, d.enabled), "available capacity"),
          inactiveEnabled: rnumber(rsub(d.enabled, d.active), "inactive enabled users"),
          avgCredits: rnumber(d.avgCredits, "per-user usage"),
          addedEnabled: rnumber(additions[index], "newly enabled users") };
        fields.forEach(function (field) { row[field] = rnumber(exact[field], "department " + field); });
        departments[index].months.push(row);
        fields.forEach(function (field) {
          departments[index].totals[field] = add(departments[index].totals[field], row[field], "department cumulative " + field);
        });
        return row;
      });
      var result = { month: month, phase: phase.label, phaseStartMonth: phase.startMonth,
        departments: rows, eligible: sum(rows, "eligible", "eligible users"),
        enabled: sum(rows, "enabled", "enabled users"), active: sum(rows, "active", "active users"),
        availableToEnable: sum(rows, "availableToEnable", "available capacity"),
        inactiveEnabled: sum(rows, "inactiveEnabled", "inactive enabled users"),
        addedEnabled: sum(rows, "addedEnabled", "newly enabled users"),
        prepaidAvailable: rnumber(prepaidAvailable, "prepaid available"),
        prepaidRemaining: rnumber(prepaidRemaining, "prepaid remaining"),
        budget: monthlyBudget };
      var monthlyPayg = rsub(totalCredits, usedPrepaid);
      var monthlyPrepaidCost = rmul(usedPrepaid, decimal(plan.prepaidRate));
      var monthlyPaygCost = rmul(monthlyPayg, decimal(plan.paygRate));
      var exactMonth = { credits: totalCredits, prepaidCredits: usedPrepaid, paygCredits: monthlyPayg,
        prepaidCost: monthlyPrepaidCost, paygCost: monthlyPaygCost, cost: radd(monthlyPrepaidCost, monthlyPaygCost) };
      fields.forEach(function (field) {
        var value = exactMonth[field];
        result[field] = rnumber(value, "monthly " + field);
        cumulative[field] = radd(cumulative[field], value);
      });
      result.headroom = rnumber(rsub(rdiv(decimal(plan.budget), decimal(plan.horizon)), exactMonth.cost), "monthly budget headroom");
      result.cumulative = {};
      fields.forEach(function (field) { result.cumulative[field] = rnumber(cumulative[field], "cumulative " + field); });
      result.cumulative.budget = plan.budget;
      result.cumulative.headroom = rnumber(rsub(decimal(plan.budget), cumulative.cost), "budget headroom");
      if (budgetExhaustionMonth === null && rcmp(cumulative.cost, decimal(plan.budget)) > 0) {
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
    var finalTotals = {};
    fields.forEach(function (field) { finalTotals[field] = rnumber(cumulative[field], "cumulative " + field); });
    return { months: months, totals: Object.assign(finalTotals, {
      eligible: last.eligible, enabled: last.enabled, active: last.active,
      availableToEnable: last.availableToEnable, inactiveEnabled: last.inactiveEnabled,
      prepaidRemaining: last.prepaidRemaining, budget: plan.budget,
      headroom: rnumber(rsub(decimal(plan.budget), cumulative.cost), "total budget headroom"),
      budgetExhaustionMonth: budgetExhaustionMonth,
      prepaidExhaustionMonth: prepaidExhaustionMonth, current: current
    }), departments: departments, nextCheckpoint: next === undefined ? null : months[next - 1] };
  }

  function validatePlan(plan) {
    var errors = validateFields(plan);
    if (errors.length === 0) {
      try {
        withPrecisionBudget(calculate, plan);
      } catch (error) {
        errors.push(error.message);
      }
    }
    return errors;
  }

  function forecast(plan) {
    var errors = validateFields(plan);
    if (errors.length) throw new Error("Invalid plan: " + errors.join("; "));
    try { return withPrecisionBudget(calculate, plan); }
    catch (error) { throw new Error("Invalid plan: " + error.message); }
  }

  /*
   * Optional scheduled department mode: departments is a nonempty array of at
   * most 50 {id, name, startingUsers, startingCreditsPerUser}; stepTargets has
   * one {month, targets: [{departmentId, users}]} for every scheduled step,
   * including steps beyond the horizon. Starting aggregate users and usage are
   * ignored in this mode. Growth is shared, but users round per department.
   * A binding global cap is apportioned by largest remainder, ties by ID.
   * Prepaid consumption is shared by demand, not by separate department pools.
   * Result.departments has each department's monthly rows and horizon totals;
   * aggregate monthly usage is demand / users, or zero when users are zero.
   */
  function validateScheduled(plan) {
    var errors = [];
    function n(value, name, min) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < min)
        errors.push(name + " must be a finite number of at least " + min);
    }
    function integer(value, name, min, max) {
      if (!Number.isInteger(value) || value < min || value > max)
        errors.push(name + " must be an integer from " + min + " to " + max);
    }
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return ["Plan must be an object"];
    integer(plan.horizon, "Forecast length", 1, 36);
    integer(plan.currentMonth, "Current month", 0, Number.isInteger(plan.horizon) ? plan.horizon : 36);
    if (typeof plan.startMonth !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(plan.startMonth) || plan.startMonth.slice(0, 4) === "0000")
      errors.push("Start month must be a valid YYYY-MM");
    integer(plan.initialUsers, "Starting users", 0, Number.MAX_SAFE_INTEGER);
    if (plan.userCap !== null) integer(plan.userCap, "Maximum users", 0, Number.MAX_SAFE_INTEGER);
    n(plan.avgCredits, "Starting credits per user", 0);
    n(plan.userGrowth, "Monthly user growth", -1);
    n(plan.usageGrowth, "Monthly usage growth per user", -1);
    if (plan.firstMonthUsageGrowth !== undefined && typeof plan.firstMonthUsageGrowth !== "boolean")
      errors.push("First-month usage growth must be true or false");
    n(plan.paygRate, "Pay-as-you-go price per credit", 0);
    n(plan.prepaidRate, "Prepaid price per credit", 0);
    n(plan.budget, "Budget for estimated credit usage", 0);
    n(plan.openingPool, "Prepaid credits available at the start", 0);
    if (!["pool", "monthly"].includes(plan.fundingMode)) errors.push("Choose how prepaid credits work");
    n(plan.monthlyAllocation, "Prepaid credits available each month", 0);
    if (!["constant", "phased"].includes(plan.growthMode)) errors.push("Choose how growth should change");
    if (!Array.isArray(plan.steps) || plan.steps.length > 36) errors.push("Step-ups must be an array of at most 36 rows");
    else {
      var seen = new Set();
      plan.steps.forEach(function (s, i) {
        if (!s || typeof s !== "object") { errors.push("Invalid user override row " + (i + 1)); return; }
        integer(s.month, "Override month", 1, 36);
        integer(s.users, "Override users", 0, Number.MAX_SAFE_INTEGER);
        if (seen.has(s.month)) errors.push("User override months must be unique");
        seen.add(s.month);
      });
    }
    if (!Array.isArray(plan.purchases) || plan.purchases.length > 200) errors.push("Purchases must be an array of at most 200 rows");
    else plan.purchases.forEach(function (p, i) {
      if (!p || typeof p !== "object") { errors.push("Invalid purchase row " + (i + 1)); return; }
      integer(p.month, "Purchase month", 1, 36);
      n(p.credits, "Purchase credits", 0);
    });
    if (!Array.isArray(plan.phases) || plan.phases.length > 36 || !plan.phases.length)
      errors.push("Phases must contain 1–36 rows");
    else {
      var previous = 0;
      plan.phases.forEach(function (p, i) {
        if (!p || typeof p !== "object") { errors.push("Invalid phase row " + (i + 1)); return; }
        integer(p.month, "Phase month", 1, 36);
        if (p.month <= previous || (i === 0 && p.month !== 1)) errors.push("Phases must start at month 1 and be strictly increasing");
        previous = p.month;
        if (typeof p.label !== "string" || p.label.length > 160) errors.push("Phase label must be text of at most 160 characters");
        n(p.userGrowth, "Phase user growth", -1);
        n(p.usageGrowth, "Phase usage growth", -1);
      });
    }
    if (plan.departments === undefined) {
      if (plan.stepTargets !== undefined) errors.push("Department step targets require departments");
    } else if (!Array.isArray(plan.departments) || !plan.departments.length || plan.departments.length > 50) {
      errors.push("Departments must contain 1–50 rows");
    } else {
      var ids = new Set(), validDepartments = true;
      plan.departments.forEach(function (d, i) {
        if (!d || typeof d !== "object" || Array.isArray(d)) {
          errors.push("Invalid department row " + (i + 1)); validDepartments = false; return;
        }
        if (typeof d.id !== "string" || !d.id.trim() || d.id.length > 160 || d.id !== d.id.trim() || ids.has(d.id)) {
          errors.push("Department IDs must be unique, nonempty trimmed text of at most 160 characters");
          validDepartments = false;
        } else ids.add(d.id);
        if (typeof d.name !== "string" || !d.name.trim() || d.name.length > 160)
          errors.push("Department names must be nonempty text of at most 160 characters");
        integer(d.startingUsers, "Department starting users", 0, Number.MAX_SAFE_INTEGER);
        n(d.startingCreditsPerUser, "Department starting credits per user", 0);
      });
      if (!Array.isArray(plan.stepTargets) || plan.stepTargets.length > 36) {
        errors.push("Department step targets must be an array of at most 36 rows");
      } else {
        var targetMonths = new Set(), stepMap = new Map();
        if (Array.isArray(plan.steps)) plan.steps.forEach(function (s) {
          if (s && typeof s === "object") stepMap.set(s.month, s);
        });
        plan.stepTargets.forEach(function (entry, i) {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            errors.push("Invalid department step target row " + (i + 1)); return;
          }
          integer(entry.month, "Department target month", 1, 36);
          if (targetMonths.has(entry.month) || !stepMap.has(entry.month))
            errors.push("Department target months must match unique rollout steps");
          targetMonths.add(entry.month);
          if (!Array.isArray(entry.targets) || entry.targets.length !== plan.departments.length) {
            errors.push("Every rollout step requires one target for every department"); return;
          }
          var targetIds = new Set(), total = 0n, validTotal = true;
          entry.targets.forEach(function (target) {
            if (!target || typeof target !== "object" || Array.isArray(target)) {
              errors.push("Invalid department target"); validTotal = false; return;
            }
            if (!ids.has(target.departmentId) || targetIds.has(target.departmentId)) {
              errors.push("Department targets must reference every department exactly once");
              validTotal = false;
            }
            targetIds.add(target.departmentId);
            integer(target.users, "Department target users", 0, Number.MAX_SAFE_INTEGER);
            if (Number.isSafeInteger(target.users) && target.users >= 0) total += BigInt(target.users);
            else validTotal = false;
          });
          var step = stepMap.get(entry.month);
          if (validDepartments && validTotal && step && Number.isSafeInteger(step.users) &&
              total !== BigInt(step.users)) errors.push("Department targets must sum to the rollout step total");
        });
        stepMap.forEach(function (_, month) {
          if (!targetMonths.has(month)) errors.push("Every rollout step requires department targets, including steps outside the forecast");
        });
      }
    }
    return errors;
  }

  function capDepartmentUsers(state, cap) {
    var total = state.reduce(function (a, d) { return a + d.users.n; }, 0n);
    if (cap === null || total <= BigInt(cap)) return;
    var limit = BigInt(cap), allocated = 0n;
    var ranked = state.map(function (d) {
      var scaled = d.users.n * limit, base = scaled / total;
      allocated += base;
      return { department: d, users: base, remainder: scaled % total };
    });
    ranked.sort(function (a, b) {
      if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
      return a.department.id < b.department.id ? -1 : a.department.id > b.department.id ? 1 : 0;
    });
    var extra = Number(limit - allocated);
    ranked.forEach(function (row, index) {
      row.department.users = rational(row.users + (index < extra ? 1n : 0n), 1n);
    });
  }

  function calculateScheduled(plan) {
    var zero = decimal(0), one = decimal(1);
    var months = [], users = decimal(plan.initialUsers), usage = decimal(plan.avgCredits);
    var departmentState = plan.departments === undefined ? null : plan.departments.map(function (d) {
      return { id: d.id, name: d.name, users: decimal(d.startingUsers), usage: decimal(d.startingCreditsPerUser) };
    });
    function outputNumber(value, description) {
      var result = rnumber(value, description);
      if (departmentState && value.n !== 0n && Math.abs(result) < Math.pow(2, -1022))
        throw new Error("Numeric underflow or subnormal value while calculating " + description + "; simplify the inputs");
      return result;
    }
    if (departmentState) {
      var startingUsers = rsum(departmentState.map(function (d) { return d.users; }));
      if (!Number.isSafeInteger(outputNumber(startingUsers, "department starting users")))
        throw new Error("Department starting users exceed safe integer range");
    }
    var departmentFields = ["credits", "prepaidCredits", "paygCredits", "prepaidCost", "paygCost", "cost"];
    var departments = departmentState && departmentState.map(function (d) {
      var sums = {};
      departmentFields.forEach(function (field) { sums[field] = zero; });
      return { id: d.id, name: d.name, months: [], sums: sums };
    });
    var balance = decimal(plan.openingPool), phaseIndex = 0, firstDepletion = null, firstPayg = null, firstBudget = null;
    var totals = { credits: zero, prepaidCredits: zero, paygCredits: zero, prepaidCost: zero, paygCost: zero, cost: zero, purchases: zero };
    var initialYear = Number(plan.startMonth.slice(0, 4)), initialMonth = Number(plan.startMonth.slice(5, 7)) - 1;
    for (var m = 1; m <= plan.horizon; m++) {
      if (phaseIndex + 1 < plan.phases.length && plan.phases[phaseIndex + 1].month === m) phaseIndex++;
      var phase = plan.phases[phaseIndex];
      var userGrowth = plan.growthMode === "phased" ? phase.userGrowth : plan.userGrowth;
      var usageGrowth = plan.growthMode === "phased" ? phase.usageGrowth : plan.usageGrowth;
      var step = plan.steps.find(function (s) { return s.month === m; });
      var departmentDemand = null, departmentTargets = null;
      if (departmentState) {
        if (step) {
          departmentTargets = new Map(plan.stepTargets.find(function (target) { return target.month === m; }).targets.map(function (target) {
            return [target.departmentId, target.users];
          }));
        }
        departmentState.forEach(function (d) {
          var grown = rmul(d.users, radd(one, decimal(userGrowth)));
          d.users = rational((grown.n * 2n + grown.d) / (grown.d * 2n), 1n);
          if (m > 1 || plan.firstMonthUsageGrowth === true)
            d.usage = rmul(d.usage, radd(one, decimal(usageGrowth)));
          outputNumber(d.usage, "department usage growth");
          if (step) d.users = decimal(departmentTargets.get(d.id));
        });
        capDepartmentUsers(departmentState, plan.userCap);
        users = rsum(departmentState.map(function (d) { return d.users; }));
        departmentDemand = departmentState.map(function (d) { return rmul(d.users, d.usage); });
      } else {
        var grown = rmul(users, radd(one, decimal(userGrowth)));
        users = rational((grown.n * 2n + grown.d) / (grown.d * 2n), 1n);
        if (m > 1 || plan.firstMonthUsageGrowth === true) {
          usage = rmul(usage, radd(one, decimal(usageGrowth)));
        }
        rnumber(usage, "usage growth");
        if (step) users = decimal(step.users);
        if (plan.userCap !== null) users = rmin(users, decimal(plan.userCap));
      }
      var userCount = outputNumber(users, "user count");
      if (!Number.isSafeInteger(userCount)) throw new Error("User count exceeds safe integer range");
      var demand = departmentState ? rsum(departmentDemand) : rmul(users, usage);
      if (departmentState) usage = userCount ? rdiv(demand, users) : zero;
      var purchase = plan.fundingMode === "pool" ? rsum(plan.purchases.filter(function (p) { return p.month === m; }).map(function (p) { return decimal(p.credits); })) : zero;
      var opening = plan.fundingMode === "pool" ? balance : zero;
      var available = plan.fundingMode === "pool" ? radd(balance, purchase) : decimal(plan.monthlyAllocation);
      var prepaid = rmin(demand, available), payg = rsub(demand, prepaid);
      balance = rsub(available, prepaid);
      var prepaidCost = rmul(prepaid, decimal(plan.prepaidRate));
      var paygCost = rmul(payg, decimal(plan.paygRate));
      var cost = radd(prepaidCost, paygCost);
      if (firstDepletion === null && rcmp(available, zero) > 0 && rcmp(balance, zero) === 0) firstDepletion = m;
      if (firstPayg === null && rcmp(payg, zero) > 0) firstPayg = m;
      var vals = { credits: demand, prepaidCredits: prepaid, paygCredits: payg, prepaidCost: prepaidCost, paygCost: paygCost, cost: cost, purchases: purchase };
      var numericVals = {};
      Object.keys(vals).forEach(function (key) {
        numericVals[key] = outputNumber(vals[key], key);
        totals[key] = radd(totals[key], vals[key]);
        outputNumber(totals[key], "cumulative " + key);
      });
      if (firstBudget === null && rcmp(totals.cost, decimal(plan.budget)) > 0) firstBudget = m;
      var dateIndex = initialYear * 12 + initialMonth + m - 1;
      var dateLabel = String(Math.floor(dateIndex / 12)).padStart(4, "0") + "-" + String(dateIndex % 12 + 1).padStart(2, "0");
      if (departmentState) {
        var prepaidShares = rallocate(prepaid, departmentDemand, demand);
        departmentState.forEach(function (d, index) {
          var departmentPayg = rsub(departmentDemand[index], prepaidShares[index]);
          var departmentPrepaidCost = rmul(prepaidShares[index], decimal(plan.prepaidRate));
          var departmentPaygCost = rmul(departmentPayg, decimal(plan.paygRate));
          var exact = { credits: departmentDemand[index], prepaidCredits: prepaidShares[index], paygCredits: departmentPayg,
            prepaidCost: departmentPrepaidCost, paygCost: departmentPaygCost, cost: radd(departmentPrepaidCost, departmentPaygCost) };
          var row = { month: m, date: dateLabel, users: outputNumber(d.users, "department users"),
            usage: outputNumber(d.usage, "department usage"), override: step ? departmentTargets.get(d.id) : null };
          departmentFields.forEach(function (field) {
            row[field] = outputNumber(exact[field], "department " + field);
            departments[index].sums[field] = radd(departments[index].sums[field], exact[field]);
            outputNumber(departments[index].sums[field], "department cumulative " + field);
          });
          departments[index].months.push(row);
        });
      }
      months.push(Object.assign({ month: m, date: dateLabel, phase: plan.growthMode === "constant" ? "Constant growth" : (phase.label || "Phase " + (phaseIndex + 1)), users: userCount, usage: outputNumber(usage, "usage"),
        override: step ? step.users : null, opening: outputNumber(opening, "opening balance"), purchase: outputNumber(purchase, "purchases"),
        available: outputNumber(available, "prepaid balance"), remaining: outputNumber(balance, "remaining balance"),
        cumulativeCost: outputNumber(totals.cost, "cumulative cost"), cumulativeCredits: outputNumber(totals.credits, "cumulative credits") }, numericVals));
    }
    var fullPayg = rmul(totals.credits, decimal(plan.paygRate));
    var commitmentCredits = plan.fundingMode === "pool" ? radd(decimal(plan.openingPool), totals.purchases) : rmul(decimal(plan.monthlyAllocation), decimal(plan.horizon));
    var commitment = rmul(commitmentCredits, decimal(plan.prepaidRate));
    var numericTotals = {};
    Object.keys(totals).forEach(function (key) { numericTotals[key] = outputNumber(totals[key], "total " + key); });
    var result = { months: months, totals: Object.assign(numericTotals, { fullPayg: outputNumber(fullPayg, "full PAYG comparator"), savings: outputNumber(rsub(fullPayg, totals.cost), "savings"),
      commitment: outputNumber(commitment, "purchase commitment value"), cashEstimate: outputNumber(radd(commitment, totals.paygCost), "commitment plus PAYG"),
      headroom: outputNumber(rsub(decimal(plan.budget), totals.cost), "budget headroom"), firstDepletion: firstDepletion,
      firstPayg: firstPayg, firstBudget: firstBudget, remaining: outputNumber(balance, "remaining balance") }) };
    if (departments) result.departments = departments.map(function (d) {
      var totals = {};
      departmentFields.forEach(function (field) { totals[field] = outputNumber(d.sums[field], "department total " + field); });
      return { id: d.id, name: d.name, months: d.months, totals: totals };
    });
    return result;
  }
  function validateScheduledPlan(plan) {
    var errors = validateScheduled(plan);
    if (!errors.length) {
      try { withPrecisionBudget(calculateScheduled, plan); } catch (e) { errors.push(e.message); }
    }
    return errors;
  }
  function forecastScheduled(plan) {
    var errors = validateScheduled(plan);
    if (errors.length) throw new Error("Invalid plan: " + errors.join("; "));
    try { return withPrecisionBudget(calculateScheduled, plan); }
    catch (error) { throw new Error("Invalid plan: " + error.message); }
  }
  return { validatePlan: validatePlan, forecast: forecast, validateScheduledPlan: validateScheduledPlan, forecastScheduled: forecastScheduled };
}));
