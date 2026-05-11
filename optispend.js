/* ============================================================
   OptiSpend — Student Budget Optimizer
   JavaScript — LP Solver, UI Logic, Scroll Animations
   ============================================================ */

// ── STEP NAVIGATION ──
const TOTAL_STEPS = 3;

function goStep(n) {
  for (let i = 0; i < TOTAL_STEPS; i++) {
    document.getElementById(`step-${i}`).style.display = i === n ? 'block' : 'none';
    document.querySelectorAll('.step-btn')[i].classList.toggle('active', i === n);
  }
  if (n === 2) prepSolveSummary();
  window.scrollTo({ top: document.getElementById('tool').offsetTop - 80, behavior: 'smooth' });
}

// ── ALLOWANCE DISPLAY ──
function updateAllowanceDisplay() {
  const v = parseFloat(document.getElementById('allowance').value) || 0;
  document.getElementById('allowance-display-2').textContent = `₱${v.toLocaleString()}`;
  document.getElementById('allowance-display-3').textContent = `₱${v.toLocaleString()}`;
}

function setAllowance(val) {
  document.getElementById('allowance').value = val;
  updateAllowanceDisplay();
}

//0.40, 0.15, 0.15, 0.10, 0.20

// ── CATEGORY DEFINITIONS ──
const cats = [
  { id: 'food', label: 'Food & Meals', icon: '🍚', 
    min_field: 'min-food', max_field: 'max-food', weight_field: 'weight-food'},

  { id: 'transport', label: 'Transportation', icon: '🚌', 
    min_field: 'min-transport', max_field: 'max-transport', weight_field: 'weight-transport'},

  { id: 'academic', label: 'Academic Requirements', icon: '📚', 
    min_field: 'min-academic', max_field: 'max-academic', weight_field: 'weight-academic'},

  { id: 'mobile', label: 'Mobile / Internet', icon: '📱', 
    min_field: 'min-mobile', max_field: 'max-mobile', weight_field: 'weight-mobile'},

  { id: 'personal', label: 'Personal Expenses', icon: '🛒', 
    min_field: 'min-personal', max_field: 'max-personal', weight_field: 'weight-personal'},
];

// ── SOLVE SUMMARY (Step 3 Preview) ──
function prepSolveSummary() {
  const allowance = parseFloat(document.getElementById('allowance').value) || 0;
  let totalMin = 0;

  const rows = cats.map(c => {
    const min = parseFloat(document.getElementById(c.min_field).value) || 0;
    const max = parseFloat(document.getElementById(c.max_field).value) || Number.MAX_VALUE;
    const weight = parseFloat(document.getElementById(c.weight_field).value) || 1;
    totalMin += min;
    return `<div class="breakdown-row">
      <span>${c.icon} ${c.label}</span>
      <span class="bval">Weight ${weight} | Min ₱${min.toLocaleString()} | ${max == Number.MAX_VALUE ? "No maximum" : (`Max ₱${max.toLocaleString()}`)}</span>
    </div>`;
  }).join('');

  const feasible = allowance >= totalMin;
  const slack = allowance - totalMin;

  document.getElementById('solve-summary').innerHTML = `
    <div style="background:rgba(0,0,0,0.15);border-radius:12px;padding:16px;">
      ${rows}
      <div class="breakdown-row" style="border-top:1px solid var(--glass-border);margin-top:8px;padding-top:12px;">
        <span style="font-weight:600;">Sum of Minimums</span>
        <span class="bval" style="color:${feasible ? 'var(--accent2)' : 'var(--error)'};">₱${totalMin.toLocaleString()}</span>
      </div>
      <div class="breakdown-row" style="background:none;">
        <span style="color:var(--muted);">Available for Savings / Flex</span>
        <span class="bval" style="color:${feasible ? 'var(--accent)' : 'var(--error)'};">
          ${feasible ? '₱' + slack.toLocaleString() : 'DEFICIT ₱' + Math.abs(slack).toLocaleString()}
        </span>
      </div>
    </div>
  `;
}

// ── SIMPLEX-BASED LP SOLVER ──
//
// LP Formulation:
//   Maximize  S = Budget - (x1 + x2 + x3 + x4 + x5)
//   Subject to:
//     xi >= min_i   (minimum allocation per category)
//     Σ xi <= Budget
//     xi >= 0
//
// Optimal solution: allocate each xi = min_i (minimum necessary).
// This maximises savings S = Budget - Σ min_i.
// Remaining slack is re-distributed proportionally as flex spending.
//
function runSolver() {
  const allowance = parseFloat(document.getElementById('allowance').value) || 0;
  const mins = cats.map(c => parseFloat(document.getElementById(c.min_field).value) || 0);
  const totalMin = mins.reduce((a, b) => a + b, 0);
  const maxs = cats.map(c => parseFloat(document.getElementById(c.max_field).value) || Number.MAX_VALUE);
  const weights = cats.map(c => parseFloat(document.getElementById(c.weight_field).value) || 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const panel = document.getElementById('result-panel');
  panel.className = 'result-panel show';

  // ── GUARD: no allowance ──
  if (allowance <= 0) {
    panel.innerHTML = `
      <div class="result-header error">
        <div class="result-icon">⚠️</div>
        <div>
          <div class="result-title">Invalid Input</div>
          <div class="result-sub">Please enter your weekly allowance first.</div>
        </div>
      </div>`;
    return;
  }

  // ── INFEASIBLE ──
  if (totalMin > allowance) {
    const deficit = totalMin - allowance;
    panel.innerHTML = `
      <div class="result-header error">
        <div class="result-icon">✕</div>
        <div>
          <div class="result-title">Not Feasible — Budget Exceeded</div>
          <div class="result-sub">
            Your minimum requirements (₱${totalMin.toLocaleString()}) exceed your
            allowance (₱${allowance.toLocaleString()}) by ₱${deficit.toLocaleString()}.
          </div>
        </div>
      </div>
      <div style="padding:16px;background:rgba(255,107,107,0.07);border:1px solid rgba(255,107,107,0.2);border-radius:12px;margin-top:12px;">
        <p style="font-size:0.88rem;font-weight:600;margin-bottom:12px;">Suggested fixes:</p>
        <ul style="font-size:0.82rem;color:var(--muted);line-height:2;padding-left:20px;">
          <li>Increase your allowance input, OR</li>
          <li>Reduce minimum for <strong style="color:var(--text)">Personal Expenses</strong> by ₱${Math.ceil(deficit * 0.5).toLocaleString()}</li>
          <li>Reduce minimum for <strong style="color:var(--text)">Mobile/Internet</strong> by ₱${Math.ceil(deficit * 0.3).toLocaleString()}</li>
          <li>Reduce minimum for <strong style="color:var(--text)">Food</strong> by ₱${Math.ceil(deficit * 0.2).toLocaleString()}</li>
        </ul>
      </div>`;
    return;
  }

  const model = {
    // optimize: {
    //   priority: "max",
    //   //budget: "min",
    // },
    constraints: {
      budget_constraint: {
        max: allowance
      }
    },
    variables: {

    }
  }

  const additionalConstraints = Object.fromEntries(
    cats.map((v, i) => [
      `${v.id}_constraints`,
      {
        max: Math.min(maxs[i], allowance * (weights[i]/totalWeight)),
        min: mins[i]
      }
    ])
  )

  model.constraints = {
    ...model.constraints,
    ...additionalConstraints
  }

  model.variables = Object.fromEntries(
    cats.map((v, i) => [
      `${v.id}`,
      {
        priority: weights[i],
        [`${v.id}_constraints`]: 1,
        budget: 1,
        budget_constraint: 1
      }
    ])
  )

  const maxSolution = solver.MultiObjective({...model, optimize: { priority: "max" }})
  const minSolution = solver.MultiObjective({...model, optimize: { budget: "min" }})
  console.log(maxSolution)
  console.log(minSolution)

  // ── FEASIBLE — Compute Optimal Allocation ──
  const remaining = allowance - minSolution.midpoint.result;  // slack = savings at optimum
  const savings = remaining;

  const flexAlloc = cats.map((v, i) => maxSolution.midpoint[v.id] - minSolution.midpoint[v.id])

  // reallocate remaining
  const flexTotal = flexAlloc.reduce((a, b) => a + b, 0);
  if (flexTotal > 0) {
    const newWeights = cats.map((v, i) => {
      if (Math.abs(maxSolution.midpoint[v.id] - maxs[i]) <= 2**-16) {
        return 0
      }
      return weights[i]
    })
    const newTotalWeight = newWeights.reduce((a, b) => a + b, 0)
    const toDistribute = (remaining - flexTotal)

    flexAlloc.forEach((_, i) => {
      flexAlloc[i] += toDistribute * (newWeights[i]/newTotalWeight)
    })

  }

  const allocations = cats.map((v, i) => flexAlloc[i] + minSolution.midpoint[v.id])
  const totalAllocated = allocations.reduce((a, b) => a + b, 0);

  // Bar gradient colours per category
  const colors = [
    'linear-gradient(90deg,#4a9eff,#3080e8)',
    'linear-gradient(90deg,#00d4aa,#00a884)',
    'linear-gradient(90deg,#f0b429,#e09000)',
    'linear-gradient(90deg,#c084fc,#9333ea)',
    'linear-gradient(90deg,#fb7185,#e11d48)',
  ];

  const bars = cats.map((c, i) => {
    const pct = ((allocations[i] / allowance) * 100).toFixed(1);
    return `
      <div class="result-bar-item">
        <div class="result-bar-label">
          <div class="result-bar-name">${c.icon} ${c.label}</div>
          <div class="result-bar-val">₱${allocations[i].toLocaleString()}</div>
        </div>
        <div class="result-bar-track">
          <div class="result-bar-fill" style="width:0%;background:${colors[i]}" data-pct="${pct}"></div>
        </div>
        <div class="result-bar-pct">
          ${pct}% of budget &nbsp;·&nbsp; Min: ₱${mins[i].toLocaleString()} + Flex: ₱${flexAlloc[i].toLocaleString()}
        </div>
      </div>`;
  }).join('');

  const savingsPct = ((savings / allowance) * 100).toFixed(1);

  panel.innerHTML = `
    <div class="result-header success">
      <div class="result-icon">✓</div>
      <div>
        <div class="result-title">Optimal Solution Found</div>
        <div class="result-sub">
          Simplex method converged. Savings maximized at ₱${savings.toLocaleString()} (${savingsPct}% of allowance).
        </div>
      </div>
    </div>
    <div class="result-bars">${bars}</div>
    <div class="result-summary">
      <div class="result-summary-item">
        <div class="val">₱${totalAllocated.toLocaleString()}</div>
        <div class="lbl">Total Allocated</div>
      </div>
      <div class="result-summary-item">
        <div class="val">₱${savings.toLocaleString()}</div>
        <div class="lbl">Optimal Savings</div>
      </div>
      <div class="result-summary-item">
        <div class="val">${savingsPct}%</div>
        <div class="lbl">Savings Rate</div>
      </div>
    </div>
    <div style="margin-top:18px;padding:14px 16px;background:rgba(74,158,255,0.07);border:1px solid rgba(74,158,255,0.15);border-radius:10px;font-size:0.8rem;color:var(--muted);">
      <strong style="color:var(--text);">LP Interpretation:</strong>
      The Simplex algorithm minimizes total expenditure (equivalently maximizes savings)
      subject to x<sub>i</sub> ≥ min<sub>i</sub> and Σx<sub>i</sub> ≤ Budget.
      The optimal basis assigns each variable its lower bound.
      Remaining slack (₱${savings.toLocaleString()}) is redistributed proportionally as recommended flexible spending.
    </div>`;

  // Animate progress bars with a short delay
  setTimeout(() => {
    document.querySelectorAll('.result-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 100);
}

// ── SEMINAR COST MODEL CALCULATOR ──
// Total Cost C(x) = 31,000 + 150x
function calcCost() {
  const x = parseInt(document.getElementById('attendees').value) || 0;
  const fixed = 31000;
  const variable = 150 * x;
  const total = fixed + variable;
  const perPerson = x > 0 ? (total / x).toFixed(2) : '—';

  document.getElementById('cost-result').style.display = x > 0 ? 'block' : 'none';
  document.getElementById('cost-breakdown').style.display = x > 0 ? 'grid' : 'none';

  if (x > 0) {
    document.getElementById('total-cost').textContent = `₱${total.toLocaleString()}`;
    document.getElementById('var-formula').textContent = `${x} × ₱150`;
    document.getElementById('var-total').textContent = `₱${variable.toLocaleString()}`;
    document.getElementById('breakdown-total').textContent = `₱${total.toLocaleString()}`;
    document.getElementById('per-attendee').textContent = `₱${parseFloat(perPerson).toLocaleString()}`;
  }
}

// ── SCROLL REVEAL (Intersection Observer) ──
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));