// Industry rate selector
document.getElementById('industry').addEventListener('change', function() {
    const rate = this.value;
    const rateInput = document.getElementById('salesProfessionalRate');

    if (rate === 'custom') {
        rateInput.disabled = false;
        rateInput.focus();
    } else {
        rateInput.value = rate;
        rateInput.disabled = true;
    }
});

// Adoption profile presets
document.getElementById('adoptionProfile').addEventListener('change', function() {
    const profile = this.value;
    const activationInput = document.getElementById('activationRate');
    const actionsInput = document.getElementById('actionsPerWeek');

    const presets = {
        conservative: { activation: 70, actions: 10 },
        moderate: { activation: 85, actions: 15 },
        strong: { activation: 95, actions: 25 }
    };

    if (presets[profile]) {
        activationInput.value = presets[profile].activation;
        actionsInput.value = presets[profile].actions;
    }
});

// Calculate projections
function calculateProjections() {
    // Get input values
    const companyName = document.getElementById('companyName').value || 'Customer Organization';
    const licensedUsers = parseInt(document.getElementById('licensedUsers').value);
    const activationRate = parseFloat(document.getElementById('activationRate').value) / 100;
    const actionsPerWeek = parseFloat(document.getElementById('actionsPerWeek').value);
    const licenseCost = parseFloat(document.getElementById('salesLicenseCost').value);
    const professionalRate = parseFloat(document.getElementById('salesProfessionalRate').value);
    const recapActions = parseInt(document.getElementById('salesIntelligentRecap').value) || 0;

    // Validate inputs
    if (!licensedUsers || licensedUsers < 1) {
        alert('Please enter a valid number of licensed users');
        return;
    }

    // Calculate derived metrics
    const activeUsers = Math.round(licensedUsers * activationRate);
    const weeklyActions = activeUsers * actionsPerWeek;
    const monthlyActions = weeklyActions * 4.33; // Average weeks per month

    // Monthly costs
    const monthlyCost = licensedUsers * licenseCost;
    const annualCost = monthlyCost * 12;

    // Calculate Intelligent Recap value
    const INTELLIGENT_RECAP_HOURS_PER_ACTION = 0.5; // 30 minutes median meeting duration
    const recapHoursSaved = recapActions * INTELLIGENT_RECAP_HOURS_PER_ACTION;
    const recapMonthlyValue = recapHoursSaved * professionalRate;
    const recapAnnualValue = recapMonthlyValue * 12;

    // Conservative scenario (3 min per action)
    const conservativeMins = 3;
    const conservativeHoursPerMonth = (monthlyActions * conservativeMins) / 60;
    const conservativeWeeklyHours = (weeklyActions * conservativeMins) / 60;
    const conservativeMonthlyValue = conservativeHoursPerMonth * professionalRate;
    const conservativeAnnualValue = conservativeMonthlyValue * 12;
    const conservativeROI = monthlyCost > 0 ? conservativeMonthlyValue / monthlyCost : 0;

    // Base scenario (6 min per action)
    const baseMins = 6;
    const baseHoursPerMonth = (monthlyActions * baseMins) / 60;
    const baseWeeklyHours = (weeklyActions * baseMins) / 60;
    const baseMonthlyValue = baseHoursPerMonth * professionalRate;
    const baseAnnualValue = baseMonthlyValue * 12;
    const baseROI = monthlyCost > 0 ? baseMonthlyValue / monthlyCost : 0;

    // Optimistic scenario (10 min per action)
    const optimisticMins = 10;
    const optimisticHoursPerMonth = (monthlyActions * optimisticMins) / 60;
    const optimisticWeeklyHours = (weeklyActions * optimisticMins) / 60;
    const optimisticMonthlyValue = optimisticHoursPerMonth * professionalRate;
    const optimisticAnnualValue = optimisticMonthlyValue * 12;
    const optimisticROI = monthlyCost > 0 ? optimisticMonthlyValue / monthlyCost : 0;

    // Payback period (months to recover annual cost)
    const conservativePayback = annualCost / conservativeMonthlyValue;
    const basePayback = annualCost / baseMonthlyValue;
    const optimisticPayback = annualCost / optimisticMonthlyValue;

    // Render results
    renderResults({
        companyName,
        licensedUsers,
        activeUsers,
        activationRate: activationRate * 100,
        actionsPerWeek,
        weeklyActions,
        monthlyActions,
        monthlyCost,
        annualCost,
        professionalRate,
        licenseCost,
        recapActions,
        recapHoursSaved,
        recapMonthlyValue,
        recapAnnualValue,
        conservative: {
            mins: conservativeMins,
            weeklyHours: conservativeWeeklyHours,
            monthlyHours: conservativeHoursPerMonth,
            monthlyValue: conservativeMonthlyValue,
            annualValue: conservativeAnnualValue,
            roi: conservativeROI,
            payback: conservativePayback
        },
        base: {
            mins: baseMins,
            weeklyHours: baseWeeklyHours,
            monthlyHours: baseHoursPerMonth,
            monthlyValue: baseMonthlyValue,
            annualValue: baseAnnualValue,
            roi: baseROI,
            payback: basePayback
        },
        optimistic: {
            mins: optimisticMins,
            weeklyHours: optimisticWeeklyHours,
            monthlyHours: optimisticHoursPerMonth,
            monthlyValue: optimisticMonthlyValue,
            annualValue: optimisticAnnualValue,
            roi: optimisticROI,
            payback: optimisticPayback
        }
    });
}

// Render results
function renderResults(data) {
    const resultsSection = document.getElementById('resultsSection');

    // Calculate values with Intelligent Recap included
    const conservativeWithRecap = {
        monthlyValue: data.conservative.monthlyValue + data.recapMonthlyValue,
        annualValue: data.conservative.annualValue + data.recapAnnualValue,
        roi: (data.conservative.monthlyValue + data.recapMonthlyValue) / data.monthlyCost,
        payback: data.annualCost / (data.conservative.monthlyValue + data.recapMonthlyValue)
    };

    const baseWithRecap = {
        monthlyValue: data.base.monthlyValue + data.recapMonthlyValue,
        annualValue: data.base.annualValue + data.recapAnnualValue,
        roi: (data.base.monthlyValue + data.recapMonthlyValue) / data.monthlyCost,
        payback: data.annualCost / (data.base.monthlyValue + data.recapMonthlyValue)
    };

    const optimisticWithRecap = {
        monthlyValue: data.optimistic.monthlyValue + data.recapMonthlyValue,
        annualValue: data.optimistic.annualValue + data.recapAnnualValue,
        roi: (data.optimistic.monthlyValue + data.recapMonthlyValue) / data.monthlyCost,
        payback: data.annualCost / (data.optimistic.monthlyValue + data.recapMonthlyValue)
    };

    // Determine if we should show recap controls (only if recap actions > 0)
    const showRecap = data.recapActions > 0;

    const html = `
        <div style="animation: fadeIn 0.5s ease;">
            <header style="text-align: center; margin-bottom: 2rem;">
                <h2 style="color: var(--copilot-blue); font-size: 2rem;">Projected Productivity ROI for ${data.companyName}</h2>
                <p style="color: var(--gray);">Based on ${data.licensedUsers.toLocaleString()} licenses with ${data.activationRate.toFixed(0)}% activation</p>
            </header>

            ${showRecap ? `
            <!-- Intelligent Recap Toggle -->
            <div class="recap-toggle-container" id="recapToggleContainer">
                <span class="recap-toggle-label">Include Intelligent Recap in ROI:</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="recapToggle" checked onchange="toggleRecapDisplay()">
                    <span class="toggle-slider"></span>
                </label>
                <span class="recap-toggle-label" id="recapToggleStatus">Included</span>
            </div>

            <!-- Intelligent Recap Value Display -->
            <div class="recap-value-box" id="recapValueBox">
                <h4>💡 Intelligent Recap Additional Value</h4>
                <div class="value">$${data.recapMonthlyValue.toLocaleString(0)}/mo</div>
                <small>${data.recapActions.toLocaleString()} actions × 0.5 hours each = ${data.recapHoursSaved.toLocaleString()} hours/mo</small>
            </div>
            ` : ''}

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Licensed Users</div>
                    <div class="metric-value">${data.licensedUsers.toLocaleString()}</div>
                    <div class="metric-sublabel">Copilot licenses</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Active Users</div>
                    <div class="metric-value">${data.activeUsers.toLocaleString()}</div>
                    <div class="metric-sublabel">${data.activationRate.toFixed(0)}% activation</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Weekly Actions</div>
                    <div class="metric-value">${data.weeklyActions.toLocaleString(0)}</div>
                    <div class="metric-sublabel">${data.actionsPerWeek} per user</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Monthly Actions</div>
                    <div class="metric-value">${data.monthlyActions.toLocaleString(0)}</div>
                    <div class="metric-sublabel">Total organization</div>
                </div>
            </div>

            <div class="roi-highlight">
                <h3>Projected Annual ROI Range</h3>
                <div class="roi-value" id="roiRangeValue"
                     data-without-recap="$${data.conservative.annualValue.toLocaleString(0)} - $${data.optimistic.annualValue.toLocaleString(0)}"
                     data-with-recap="$${conservativeWithRecap.annualValue.toLocaleString(0)} - $${optimisticWithRecap.annualValue.toLocaleString(0)}">
                    ${showRecap ? `$${conservativeWithRecap.annualValue.toLocaleString(0)} - $${optimisticWithRecap.annualValue.toLocaleString(0)}` : `$${data.conservative.annualValue.toLocaleString(0)} - $${data.optimistic.annualValue.toLocaleString(0)}`}
                </div>
                <p style="font-size: 1.2rem; margin: 0;" id="roiMultipleText"
                   data-without-recap="${data.conservative.roi.toFixed(1)}x to ${data.optimistic.roi.toFixed(1)}x return on investment"
                   data-with-recap="${conservativeWithRecap.roi.toFixed(1)}x to ${optimisticWithRecap.roi.toFixed(1)}x return on investment">
                    ${showRecap ? `${conservativeWithRecap.roi.toFixed(1)}x to ${optimisticWithRecap.roi.toFixed(1)}x return on investment` : `${data.conservative.roi.toFixed(1)}x to ${data.optimistic.roi.toFixed(1)}x return on investment`}
                </p>
            </div>

            <div class="scenario-comparison">
                <div class="scenario-card">
                    <h3>Conservative Scenario</h3>
                    <p style="text-align: center; color: var(--gray); margin-bottom: 1.5rem;">
                        ${data.conservative.mins} minutes saved per action
                    </p>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Weekly Hours Saved</span>
                        <span class="scenario-metric-value">${data.conservative.weeklyHours.toLocaleString(0)}</span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Monthly Hours Saved</span>
                        <span class="scenario-metric-value">${data.conservative.monthlyHours.toLocaleString(0)}</span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Monthly Value</span>
                        <span class="scenario-metric-value" id="conservativeMonthlyValue"
                             data-without-recap="$${data.conservative.monthlyValue.toLocaleString(0)}"
                             data-with-recap="$${conservativeWithRecap.monthlyValue.toLocaleString(0)}">
                            ${showRecap ? `$${conservativeWithRecap.monthlyValue.toLocaleString(0)}` : `$${data.conservative.monthlyValue.toLocaleString(0)}`}
                        </span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Annual Value</span>
                        <span class="scenario-metric-value" id="conservativeAnnualValue"
                             data-without-recap="$${data.conservative.annualValue.toLocaleString(0)}"
                             data-with-recap="$${conservativeWithRecap.annualValue.toLocaleString(0)}">
                            ${showRecap ? `$${conservativeWithRecap.annualValue.toLocaleString(0)}` : `$${data.conservative.annualValue.toLocaleString(0)}`}
                        </span>
                    </div>

                    <div class="scenario-metric" style="background: var(--light-gray); margin-top: 1rem; padding: 1rem; border-radius: 6px;">
                        <span class="scenario-metric-label" style="font-weight: bold;">ROI Multiple</span>
                        <span class="scenario-metric-value" id="conservativeROI" style="color: var(--green); font-size: 1.5rem;"
                             data-without-recap="${data.conservative.roi.toFixed(1)}x"
                             data-with-recap="${conservativeWithRecap.roi.toFixed(1)}x">
                            ${showRecap ? `${conservativeWithRecap.roi.toFixed(1)}x` : `${data.conservative.roi.toFixed(1)}x`}
                        </span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Payback Period</span>
                        <span class="scenario-metric-value" id="conservativePayback"
                             data-without-recap="${data.conservative.payback.toFixed(1)} mo"
                             data-with-recap="${conservativeWithRecap.payback.toFixed(1)} mo">
                            ${showRecap ? `${conservativeWithRecap.payback.toFixed(1)} mo` : `${data.conservative.payback.toFixed(1)} mo`}
                        </span>
                    </div>
                </div>

                <div class="scenario-card highlight">
                    <h3>Base Scenario (Recommended)</h3>
                    <p style="text-align: center; color: var(--gray); margin-bottom: 1.5rem;">
                        ${data.base.mins} minutes saved per action
                    </p>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Weekly Hours Saved</span>
                        <span class="scenario-metric-value">${data.base.weeklyHours.toLocaleString(0)}</span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Monthly Hours Saved</span>
                        <span class="scenario-metric-value">${data.base.monthlyHours.toLocaleString(0)}</span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Monthly Value</span>
                        <span class="scenario-metric-value" id="baseMonthlyValue"
                             data-without-recap="$${data.base.monthlyValue.toLocaleString(0)}"
                             data-with-recap="$${baseWithRecap.monthlyValue.toLocaleString(0)}">
                            ${showRecap ? `$${baseWithRecap.monthlyValue.toLocaleString(0)}` : `$${data.base.monthlyValue.toLocaleString(0)}`}
                        </span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Annual Value</span>
                        <span class="scenario-metric-value" id="baseAnnualValue"
                             data-without-recap="$${data.base.annualValue.toLocaleString(0)}"
                             data-with-recap="$${baseWithRecap.annualValue.toLocaleString(0)}">
                            ${showRecap ? `$${baseWithRecap.annualValue.toLocaleString(0)}` : `$${data.base.annualValue.toLocaleString(0)}`}
                        </span>
                    </div>

                    <div class="scenario-metric" style="background: rgba(245, 158, 11, 0.2); border: 1px solid var(--copilot-orange); margin-top: 1rem; padding: 1rem; border-radius: 8px;">
                        <span class="scenario-metric-label" style="font-weight: bold; color: var(--copilot-orange);">ROI Multiple</span>
                        <span class="scenario-metric-value" id="baseROI" style="color: var(--copilot-orange); font-size: 1.5rem;"
                             data-without-recap="${data.base.roi.toFixed(1)}x"
                             data-with-recap="${baseWithRecap.roi.toFixed(1)}x">
                            ${showRecap ? `${baseWithRecap.roi.toFixed(1)}x` : `${data.base.roi.toFixed(1)}x`}
                        </span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Payback Period</span>
                        <span class="scenario-metric-value" id="basePayback"
                             data-without-recap="${data.base.payback.toFixed(1)} mo"
                             data-with-recap="${baseWithRecap.payback.toFixed(1)} mo">
                            ${showRecap ? `${baseWithRecap.payback.toFixed(1)} mo` : `${data.base.payback.toFixed(1)} mo`}
                        </span>
                    </div>
                </div>

                <div class="scenario-card">
                    <h3>Optimistic Scenario</h3>
                    <p style="text-align: center; color: var(--gray); margin-bottom: 1.5rem;">
                        ${data.optimistic.mins} minutes saved per action
                    </p>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Weekly Hours Saved</span>
                        <span class="scenario-metric-value">${data.optimistic.weeklyHours.toLocaleString(0)}</span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Monthly Hours Saved</span>
                        <span class="scenario-metric-value">${data.optimistic.monthlyHours.toLocaleString(0)}</span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Monthly Value</span>
                        <span class="scenario-metric-value" id="optimisticMonthlyValue"
                             data-without-recap="$${data.optimistic.monthlyValue.toLocaleString(0)}"
                             data-with-recap="$${optimisticWithRecap.monthlyValue.toLocaleString(0)}">
                            ${showRecap ? `$${optimisticWithRecap.monthlyValue.toLocaleString(0)}` : `$${data.optimistic.monthlyValue.toLocaleString(0)}`}
                        </span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Annual Value</span>
                        <span class="scenario-metric-value" id="optimisticAnnualValue"
                             data-without-recap="$${data.optimistic.annualValue.toLocaleString(0)}"
                             data-with-recap="$${optimisticWithRecap.annualValue.toLocaleString(0)}">
                            ${showRecap ? `$${optimisticWithRecap.annualValue.toLocaleString(0)}` : `$${data.optimistic.annualValue.toLocaleString(0)}`}
                        </span>
                    </div>

                    <div class="scenario-metric" style="background: var(--light-gray); margin-top: 1rem; padding: 1rem; border-radius: 6px;">
                        <span class="scenario-metric-label" style="font-weight: bold;">ROI Multiple</span>
                        <span class="scenario-metric-value" id="optimisticROI" style="color: var(--green); font-size: 1.5rem;"
                             data-without-recap="${data.optimistic.roi.toFixed(1)}x"
                             data-with-recap="${optimisticWithRecap.roi.toFixed(1)}x">
                            ${showRecap ? `${optimisticWithRecap.roi.toFixed(1)}x` : `${data.optimistic.roi.toFixed(1)}x`}
                        </span>
                    </div>

                    <div class="scenario-metric">
                        <span class="scenario-metric-label">Payback Period</span>
                        <span class="scenario-metric-value" id="optimisticPayback"
                             data-without-recap="${data.optimistic.payback.toFixed(1)} mo"
                             data-with-recap="${optimisticWithRecap.payback.toFixed(1)} mo">
                            ${showRecap ? `${optimisticWithRecap.payback.toFixed(1)} mo` : `${data.optimistic.payback.toFixed(1)} mo`}
                        </span>
                    </div>
                </div>
            </div>

            <div class="assumptions-box">
                <h4>Calculation Assumptions</h4>
                <ul>
                    <li><strong>Licensed Users:</strong> ${data.licensedUsers.toLocaleString()} users</li>
                    <li><strong>Activation Rate:</strong> ${data.activationRate.toFixed(0)}% (${data.activeUsers.toLocaleString()} active users)</li>
                    <li><strong>Usage Pattern:</strong> ${data.actionsPerWeek} Copilot actions per user per week</li>
                    <li><strong>License Cost:</strong> $${data.licenseCost}/user/month = $${data.monthlyCost.toLocaleString(0)}/month total</li>
                    <li><strong>Annual Investment:</strong> $${data.annualCost.toLocaleString(0)}</li>
                    <li><strong>Professional Rate:</strong> $${data.professionalRate}/hour (fully-loaded cost)</li>
                    <li><strong>Time Savings:</strong> Conservative (${data.conservative.mins} min), Base (${data.base.mins} min), Optimistic (${data.optimistic.mins} min) per action</li>
                    <li><strong>ROI Calculation:</strong> Monthly productivity value ÷ monthly license cost</li>
                    <li><strong>Payback Period:</strong> Annual license cost ÷ monthly value generated</li>
                </ul>
            </div>

            <div class="roi-table-container">
                <h2>Value Breakdown by Scenario</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Scenario</th>
                            <th>Time per Action</th>
                            <th>Monthly Hours</th>
                            <th>Monthly Value</th>
                            <th>Annual Value</th>
                            <th>ROI Multiple</th>
                            <th>Payback</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Conservative</strong></td>
                            <td>${data.conservative.mins} min</td>
                            <td>${data.conservative.monthlyHours.toLocaleString(0)} hrs</td>
                            <td id="tableConservativeMonthly"
                                data-without-recap="$${data.conservative.monthlyValue.toLocaleString(0)}"
                                data-with-recap="$${conservativeWithRecap.monthlyValue.toLocaleString(0)}">
                                ${showRecap ? `$${conservativeWithRecap.monthlyValue.toLocaleString(0)}` : `$${data.conservative.monthlyValue.toLocaleString(0)}`}
                            </td>
                            <td id="tableConservativeAnnual"
                                data-without-recap="$${data.conservative.annualValue.toLocaleString(0)}"
                                data-with-recap="$${conservativeWithRecap.annualValue.toLocaleString(0)}">
                                ${showRecap ? `$${conservativeWithRecap.annualValue.toLocaleString(0)}` : `$${data.conservative.annualValue.toLocaleString(0)}`}
                            </td>
                            <td id="tableConservativeROI" style="color: var(--green); font-weight: bold;"
                                data-without-recap="${data.conservative.roi.toFixed(1)}x"
                                data-with-recap="${conservativeWithRecap.roi.toFixed(1)}x">
                                ${showRecap ? `${conservativeWithRecap.roi.toFixed(1)}x` : `${data.conservative.roi.toFixed(1)}x`}
                            </td>
                            <td id="tableConservativePayback"
                                data-without-recap="${data.conservative.payback.toFixed(1)} mo"
                                data-with-recap="${conservativeWithRecap.payback.toFixed(1)} mo">
                                ${showRecap ? `${conservativeWithRecap.payback.toFixed(1)} mo` : `${data.conservative.payback.toFixed(1)} mo`}
                            </td>
                        </tr>
                        <tr class="highlight-row">
                            <td><strong>Base (Recommended)</strong></td>
                            <td>${data.base.mins} min</td>
                            <td>${data.base.monthlyHours.toLocaleString(0)} hrs</td>
                            <td id="tableBaseMonthly"
                                data-without-recap="$${data.base.monthlyValue.toLocaleString(0)}"
                                data-with-recap="$${baseWithRecap.monthlyValue.toLocaleString(0)}">
                                ${showRecap ? `$${baseWithRecap.monthlyValue.toLocaleString(0)}` : `$${data.base.monthlyValue.toLocaleString(0)}`}
                            </td>
                            <td id="tableBaseAnnual"
                                data-without-recap="$${data.base.annualValue.toLocaleString(0)}"
                                data-with-recap="$${baseWithRecap.annualValue.toLocaleString(0)}">
                                ${showRecap ? `$${baseWithRecap.annualValue.toLocaleString(0)}` : `$${data.base.annualValue.toLocaleString(0)}`}
                            </td>
                            <td id="tableBaseROI" style="color: var(--green); font-weight: bold;"
                                data-without-recap="${data.base.roi.toFixed(1)}x"
                                data-with-recap="${baseWithRecap.roi.toFixed(1)}x">
                                ${showRecap ? `${baseWithRecap.roi.toFixed(1)}x` : `${data.base.roi.toFixed(1)}x`}
                            </td>
                            <td id="tableBasePayback"
                                data-without-recap="${data.base.payback.toFixed(1)} mo"
                                data-with-recap="${baseWithRecap.payback.toFixed(1)} mo">
                                ${showRecap ? `${baseWithRecap.payback.toFixed(1)} mo` : `${data.base.payback.toFixed(1)} mo`}
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Optimistic</strong></td>
                            <td>${data.optimistic.mins} min</td>
                            <td>${data.optimistic.monthlyHours.toLocaleString(0)} hrs</td>
                            <td id="tableOptimisticMonthly"
                                data-without-recap="$${data.optimistic.monthlyValue.toLocaleString(0)}"
                                data-with-recap="$${optimisticWithRecap.monthlyValue.toLocaleString(0)}">
                                ${showRecap ? `$${optimisticWithRecap.monthlyValue.toLocaleString(0)}` : `$${data.optimistic.monthlyValue.toLocaleString(0)}`}
                            </td>
                            <td id="tableOptimisticAnnual"
                                data-without-recap="$${data.optimistic.annualValue.toLocaleString(0)}"
                                data-with-recap="$${optimisticWithRecap.annualValue.toLocaleString(0)}">
                                ${showRecap ? `$${optimisticWithRecap.annualValue.toLocaleString(0)}` : `$${data.optimistic.annualValue.toLocaleString(0)}`}
                            </td>
                            <td id="tableOptimisticROI" style="color: var(--green); font-weight: bold;"
                                data-without-recap="${data.optimistic.roi.toFixed(1)}x"
                                data-with-recap="${optimisticWithRecap.roi.toFixed(1)}x">
                                ${showRecap ? `${optimisticWithRecap.roi.toFixed(1)}x` : `${data.optimistic.roi.toFixed(1)}x`}
                            </td>
                            <td id="tableOptimisticPayback"
                                data-without-recap="${data.optimistic.payback.toFixed(1)} mo"
                                data-with-recap="${optimisticWithRecap.payback.toFixed(1)} mo">
                                ${showRecap ? `${optimisticWithRecap.payback.toFixed(1)} mo` : `${data.optimistic.payback.toFixed(1)} mo`}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="info-box" style="margin-top: 2rem;">
                <strong>Sales Guidance</strong>
                <p>
                    • <strong>Lead with the Base Scenario:</strong> 6 minutes per action is backed by Microsoft research and industry averages<br>
                    • <strong>Show the range:</strong> Conservative to Optimistic demonstrates realistic bounds based on adoption<br>
                    • <strong>Emphasize quick payback:</strong> ${data.base.payback.toFixed(1)} month payback period means rapid value realization<br>
                    • <strong>ROI multiple:</strong> ${data.base.roi.toFixed(1)}x return shows compelling business case<br>
                    • <strong>Customize for industry:</strong> Adjust professional rate to match customer's sector<br>
                    • <strong>Scale with confidence:</strong> These projections are based on real-world deployment patterns
                </p>
            </div>

            <div style="text-align: center; margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                <button class="btn-secondary" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">← Modify Inputs</button>
                <button class="btn-primary" onclick="exportToEmail()">Email</button>
            </div>
        </div>
    `;

    resultsSection.innerHTML = html;
    resultsSection.style.display = 'block';

    // Smooth scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Email export function
function exportToEmail() {
    const companyName = document.getElementById('companyName').value || 'Customer Organization';

    const subject = encodeURIComponent(`M365 Copilot Productivity ROI Projection for ${companyName}`);
    const body = encodeURIComponent(`Hi,

I've prepared a Copilot ROI projection for ${companyName} based on our discussion.

Please see the attached analysis showing projected annual returns ranging from conservative to optimistic scenarios.

Best regards`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Toggle Intelligent Recap display
function toggleRecapDisplay() {
    const toggle = document.getElementById('recapToggle');
    const statusText = document.getElementById('recapToggleStatus');
    const isIncluded = toggle.checked;

    // Update status text
    statusText.textContent = isIncluded ? 'Included' : 'Excluded';

    // Get all elements that need updating
    const elementsToUpdate = [
        'roiRangeValue',
        'roiMultipleText',
        'conservativeMonthlyValue',
        'conservativeAnnualValue',
        'conservativeROI',
        'conservativePayback',
        'baseMonthlyValue',
        'baseAnnualValue',
        'baseROI',
        'basePayback',
        'optimisticMonthlyValue',
        'optimisticAnnualValue',
        'optimisticROI',
        'optimisticPayback',
        'tableConservativeMonthly',
        'tableConservativeAnnual',
        'tableConservativeROI',
        'tableConservativePayback',
        'tableBaseMonthly',
        'tableBaseAnnual',
        'tableBaseROI',
        'tableBasePayback',
        'tableOptimisticMonthly',
        'tableOptimisticAnnual',
        'tableOptimisticROI',
        'tableOptimisticPayback'
    ];

    // Update each element based on toggle state
    elementsToUpdate.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const valueToShow = isIncluded ?
                element.getAttribute('data-with-recap') :
                element.getAttribute('data-without-recap');
            element.textContent = valueToShow;
        }
    });
}
