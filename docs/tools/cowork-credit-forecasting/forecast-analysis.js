/*
 * Scheduled-forecast analysis only. Load rollout-engine.js first in browsers;
 * CommonJS loads it from the same directory.
 *
 * Analysis functions return {inputs, period, units, errors, ...}. Errors are
 * arrays of messages; an invalid original plan never produces an analysis.
 * A scenario holds {growthAdjustmentPercentagePoints, forecast, errors};
 * forecast is the unmodified forecastScheduled result, or null on error.
 *
 * Phase contributions decompose the entire forecast horizon, not just each
 * phase's calendar window. The baseline holds the first phase's rates forward
 * while retaining every other assumption. Each subsequent in-period phase is
 * restored in order and its increment is the difference from the preceding
 * variant. Increments may be negative and are order-dependent. The baseline
 * includes all steps, purchases and initial activity; it is not zero-growth.
 * Constant mode has one baseline and no phase increments. Outside-period
 * phases are listed but not attributed. Forecasts are engine results; delta
 * numbers are differences of the engine's returned JavaScript numbers.
 *
 * timelineWaterfall(plan, forecast) compares the modeled starting monthly
 * demand with the actual scheduled forecast at each phase's last month.
 * The supplied forecast must match the plan. These changes are chronological,
 * not causal attribution, and the starting input is not necessarily historical.
 * Its baseline, lastValue, from, to and delta values are monthly credits.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(function () { return require("./rollout-engine.js"); });
  } else {
    root.ForecastAnalysis = factory(function () { return root.ForecastEngine; });
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (getEngine) {
  "use strict";

  function metadata(plan, extra) {
    var validObject = plan && typeof plan === "object" && !Array.isArray(plan);
    return {
      inputs: Object.assign({
        growthMode: validObject ? plan.growthMode : null,
        firstMonthUsageGrowth: validObject ? plan.firstMonthUsageGrowth === true : null
      }, extra || {}),
      period: validObject ? { startMonth: plan.startMonth, horizon: plan.horizon } : null,
      units: { growth: "decimal", sensitivity: "percentage points", credits: "credits", cost: "plan currency" },
      errors: []
    };
  }

  function engineForecast(plan) {
    var engine = getEngine();
    if (!engine || typeof engine.forecastScheduled !== "function") {
      throw new Error("ForecastEngine.forecastScheduled is required");
    }
    return engine.forecastScheduled(plan);
  }

  function message(error) {
    return error && error.message ? error.message : String(error);
  }

  // Decimal-string addition avoids artifacts such as 0.1 - 0.2 / 100.
  function decimalParts(value) {
    var match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
    var digits = match[2] + (match[3] || "");
    return { coefficient: BigInt((match[1] || "") + digits),
      exponent: Number(match[4] || 0) - (match[3] || "").length };
  }

  function startingDemand(plan) {
    var rows = plan.departments === undefined
      ? [{ users: plan.initialUsers, usage: plan.avgCredits }]
      : plan.departments.map(function (department) {
        return { users: department.startingUsers, usage: department.startingCreditsPerUser };
      });
    var products = rows.map(function (row) {
      var users = decimalParts(row.users), usage = decimalParts(row.usage);
      return { coefficient: users.coefficient * usage.coefficient,
        exponent: users.exponent + usage.exponent };
    });
    var exponent = Math.min.apply(null, products.map(function (product) { return product.exponent; }));
    var sum = products.reduce(function (total, product) {
      return total + product.coefficient * 10n ** BigInt(product.exponent - exponent);
    }, 0n);
    var value = Number(sum.toString() + "e" + exponent);
    if (!Number.isFinite(value)) throw new Error("Numeric overflow while calculating modeled starting demand");
    return value;
  }

  function adjustedRate(rate, points, direction) {
    var a = decimalParts(rate), b = decimalParts(points);
    b.exponent -= 2;
    var exponent = Math.min(a.exponent, b.exponent);
    var coefficient = a.coefficient * 10n ** BigInt(a.exponent - exponent) +
      BigInt(direction) * b.coefficient * 10n ** BigInt(b.exponent - exponent);
    if (exponent <= 0 ? coefficient < -(10n ** BigInt(-exponent)) :
      coefficient * 10n ** BigInt(exponent) < -1n) {
      throw new Error("Adjusted usage growth must be at least -1 (-100%)");
    }
    var result = Number(coefficient.toString() + "e" + exponent);
    if (!Number.isFinite(result)) throw new Error("Adjusted usage growth is not finite");
    return result;
  }

  function sensitivity(plan, percentagePoints) {
    var result = metadata(plan, { percentagePoints: percentagePoints });
    result.scenarios = { low: null, base: null, high: null };
    var base;
    try { base = engineForecast(plan); }
    catch (error) { result.errors.push(message(error)); return result; }
    result.inputs.rates = plan.growthMode === "constant"
      ? { userGrowth: plan.userGrowth, usageGrowth: plan.usageGrowth }
      : plan.phases.map(function (phase) {
        return { month: phase.month, label: phase.label, userGrowth: phase.userGrowth,
          usageGrowth: phase.usageGrowth, inPeriod: phase.month <= plan.horizon };
      });
    if (typeof percentagePoints !== "number" || !Number.isFinite(percentagePoints) || percentagePoints < 0) {
      result.errors.push("percentagePoints must be a finite nonnegative number");
      return result;
    }
    result.scenarios.base = { growthAdjustmentPercentagePoints: 0, forecast: base, errors: [] };
    ["low", "high"].forEach(function (name) {
      var direction = name === "low" ? -1 : 1;
      var scenario = { growthAdjustmentPercentagePoints: direction * percentagePoints, forecast: null, errors: [] };
      result.scenarios[name] = scenario;
      try {
        var variant = Object.assign({}, plan);
        if (plan.growthMode === "constant") {
          variant.usageGrowth = adjustedRate(plan.usageGrowth, percentagePoints, direction);
        } else {
          variant.phases = plan.phases.map(function (phase) {
            return phase.month <= plan.horizon
              ? Object.assign({}, phase, { usageGrowth: adjustedRate(phase.usageGrowth, percentagePoints, direction) })
              : phase;
          });
        }
        scenario.forecast = engineForecast(variant);
      } catch (error) { scenario.errors.push(message(error)); }
    });
    return result;
  }

  var monthFields = ["users", "usage", "credits", "prepaidCredits", "paygCredits",
    "prepaidCost", "paygCost", "cost", "cumulativeCredits", "cumulativeCost"];
  var totalFields = ["credits", "prepaidCredits", "paygCredits", "prepaidCost", "paygCost", "cost"];

  function differences(after, before, fields) {
    var delta = {};
    fields.forEach(function (field) {
      var value = after[field] - before[field];
      if (!Number.isFinite(value)) throw new Error("Numeric overflow while calculating " + field + " contribution");
      delta[field] = value;
    });
    return delta;
  }

  function forecastDelta(after, before) {
    return {
      months: after.months.map(function (month, i) {
        return Object.assign({ month: month.month, date: month.date },
          differences(month, before.months[i], monthFields));
      }),
      totals: differences(after.totals, before.totals, totalFields)
    };
  }

  function phaseContributions(plan) {
    var result = metadata(plan);
    result.method = "Sequential scheduled forecasts; later rates held at the last restored phase. Attribution is order-dependent and increments may be negative.";
    result.baseline = null;
    result.contributions = [];
    result.excludedPhases = [];
    var actual;
    try { actual = engineForecast(plan); }
    catch (error) { result.errors.push(message(error)); return result; }
    result.inputs.rates = plan.growthMode === "constant"
      ? { userGrowth: plan.userGrowth, usageGrowth: plan.usageGrowth }
      : plan.phases.map(function (phase) {
        return { month: phase.month, label: phase.label, userGrowth: phase.userGrowth,
          usageGrowth: phase.usageGrowth, inPeriod: phase.month <= plan.horizon };
      });

    if (plan.growthMode === "constant") {
      result.baseline = { label: "Constant growth", startMonth: 1, endMonth: plan.horizon,
        userGrowth: plan.userGrowth, usageGrowth: plan.usageGrowth, forecast: actual };
      return result;
    }

    var active = plan.phases.filter(function (phase) { return phase.month <= plan.horizon; });
    result.excludedPhases = plan.phases.map(function (phase, index) {
      return { index: index, label: phase.label, startMonth: phase.month,
        userGrowth: phase.userGrowth, usageGrowth: phase.usageGrowth };
    }).filter(function (phase) { return phase.startMonth > plan.horizon; });

    function variantThrough(index) {
      var held = active[index];
      return Object.assign({}, plan, {
        phases: plan.phases.map(function (phase, i) {
          return i > index && phase.month <= plan.horizon
            ? Object.assign({}, phase, { userGrowth: held.userGrowth, usageGrowth: held.usageGrowth })
            : phase;
        })
      });
    }

    try {
      var previous = active.length === 1 ? actual : engineForecast(variantThrough(0));
      result.baseline = { index: 0, label: active[0].label, startMonth: 1,
        endMonth: active.length > 1 ? active[1].month - 1 : plan.horizon,
        userGrowth: active[0].userGrowth, usageGrowth: active[0].usageGrowth, forecast: previous };
      for (var i = 1; i < active.length; i++) {
        var current = i === active.length - 1 ? actual : engineForecast(variantThrough(i));
        result.contributions.push({ index: i, label: active[i].label, startMonth: active[i].month,
          endMonth: i + 1 < active.length ? active[i + 1].month - 1 : plan.horizon,
          userGrowth: active[i].userGrowth, usageGrowth: active[i].usageGrowth,
          forecast: current, delta: forecastDelta(current, previous) });
        previous = current;
      }
    } catch (error) { result.errors.push(message(error)); }
    return result;
  }

  function timelineWaterfall(plan, forecast) {
    var result = metadata(plan);
    result.method = "Chronological changes in monthly credit demand from modeled starting input; not historical actuals or causal attribution.";
    result.baseline = null;
    result.lastValue = null;
    result.phases = [];
    result.excludedPhases = [];
    try {
      var expected = engineForecast(plan);
      if (!forecast || typeof forecast !== "object" || !Array.isArray(forecast.months) ||
          forecast.months.length !== plan.horizon) {
        throw new Error("A matching scheduled forecast with all months is required");
      }
      forecast.months.forEach(function (month, i) {
        var reference = expected.months[i];
        if (!month || month.month !== reference.month || month.date !== reference.date ||
            typeof month.credits !== "number" || !Number.isFinite(month.credits) ||
            month.credits < 0 || month.credits !== reference.credits) {
          throw new Error("Scheduled forecast does not match the plan at month " + (i + 1));
        }
      });

      var baseline = startingDemand(plan);

      var active = plan.growthMode === "constant"
        ? [{ index: 0, label: "Forecast", startMonth: 1 }]
        : plan.phases.map(function (phase, index) {
          return { index: index, label: phase.label, startMonth: phase.month };
        });
      var excluded = active.filter(function (phase) { return phase.startMonth > plan.horizon; });
      active = active.filter(function (phase) { return phase.startMonth <= plan.horizon; });
      var previous = baseline;
      var phases = active.map(function (phase, i) {
        var endMonth = i + 1 < active.length ? active[i + 1].startMonth - 1 : plan.horizon;
        var from = previous;
        var to = forecast.months[endMonth - 1].credits;
        var delta = to - from;
        if (!Number.isFinite(delta)) throw new Error("Numeric overflow while calculating phase change");
        previous = to;
        return { index: phase.index, label: phase.label, startMonth: phase.startMonth,
          endMonth: endMonth, startDate: forecast.months[phase.startMonth - 1].date,
          endDate: forecast.months[endMonth - 1].date, from: from, to: to, delta: delta };
      });
      result.baseline = baseline;
      result.lastValue = forecast.months[plan.horizon - 1].credits;
      result.phases = phases;
      result.excludedPhases = excluded;
    } catch (error) { result.errors.push(message(error)); }
    return result;
  }

  return { sensitivity: sensitivity, phaseContributions: phaseContributions, timelineWaterfall: timelineWaterfall };
}));
