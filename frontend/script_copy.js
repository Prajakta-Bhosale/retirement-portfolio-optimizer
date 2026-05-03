// ================== CONFIG ==================
const API_BASE = "http://localhost:8000";

const API_ENDPOINTS = {
  users: `${API_BASE}/api/users`,
  portfolio: (id) => `${API_BASE}/api/portfolio/${id}`,
  predict: `${API_BASE}/api/predict`, // POST
  models: `${API_BASE}/api/models`,
  compare: (id) => `${API_BASE}/api/portfolio/${id}/compare`,
  updateRisk: (id) => `${API_BASE}/api/portfolio/${id}/update-risk`,
};

// ================== STATE ==================
let state = {
  currentUser: null,
  currentModel: "mpt",
  users: [],
  portfolioData: null,
  predictions: null,
  models: [],
  metrics: null,
};

let currentAllocChart = null;
let optimizedAllocChart = null;
let healthRadarChart = null;
let vitalsLineChart = null;
let riskReturnChart = null;

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", async () => {
  await loadUsers();
  setupEventListeners();
  await checkAPIConnection();
});

// ================== HEALTH CHECK ==================
async function checkAPIConnection() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      setStatus(true);
      showToast("Connected to backend", "success");
    } else {
      setStatus(false);
      showToast("Failed to connect to backend", "error");
    }
  } catch (error) {
    setStatus(false);
    showToast("Failed to connect to backend", "error");
  }
}

function setStatus(connected) {
  const indicator = document.getElementById("status-indicator");
  const text = document.getElementById("status-text");
  if (!indicator || !text) return;
  if (connected) {
    indicator.classList.add("connected");
    text.textContent = "Connected";
  } else {
    indicator.classList.remove("connected");
    text.textContent = "Disconnected";
  }
}

// ================== LOAD USERS ==================
async function loadUsers() {
  try {
    showLoader(true);
    const response = await axios.get(API_ENDPOINTS.users);
    const { userids, total_users } = response.data;
    state.users = userids;

    const usersStat = document.getElementById("stat-users");
    if (usersStat) usersStat.textContent = total_users;

    const userSelect = document.getElementById("user-select");
    if (!userSelect) return;

    userSelect.innerHTML = "";

    // New: fetch portfolio data for each user to get age, filter <= 65, limit to 100
    const filtered = [];
    for (const id of userids) {
      if (filtered.length >= 100) break;
      try {
        const pResp = await axios.get(API_ENDPOINTS.portfolio(id));
        const age = pResp.data?.portfolio_data?.age;
        if (typeof age === "number" && age <= 65) {
          filtered.push(id);
        }
      } catch (e) {
        // ignore individual failures, keep loading others
        console.warn("Skipping user", id, e);
      }
    }

    filtered.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      userSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading users", error);
    showToast("Failed to load users", "error");
  } finally {
    showLoader(false);
  }
}


// ================== EVENT LISTENERS ==================
function setupEventListeners() {
  const userSelect = document.getElementById("user-select");
  if (userSelect) {
    userSelect.addEventListener("change", async (e) => {
      const userId = e.target.value;
      if (userId) {
        await selectUser(userId);
      } else {
        resetView();
      }
    });
  }

  document.querySelectorAll(".model-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const model = e.currentTarget.dataset.model;
      await selectModel(model);
    });
  });

  const applyBtn = document.getElementById("apply-btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", applyAllocation);
  }
}

// ================== VIEW RESET ==================
function resetView() {
  const ui = document.getElementById("user-info");
  const pred = document.getElementById("predictions-container");
  const empty = document.getElementById("empty-state");
  const health = document.getElementById("health-panel");
  const fin = document.getElementById("financial-panel");
  const cmp = document.getElementById("comparison-panel");

  if (ui) ui.classList.add("hidden");
  if (pred) pred.classList.add("hidden");
  if (empty) empty.classList.remove("hidden");
  if (health) health.style.display = "none";
  if (fin) fin.style.display = "none";
  if (cmp) cmp.style.display = "none";
}

// ================== SELECT USER ==================
async function selectUser(userId) {
  try {
    showLoader(true);
    state.currentUser = userId;

    const response = await axios.get(API_ENDPOINTS.portfolio(userId));
    const { portfolio_data, predictions, portfolio_metrics } = response.data;

    state.portfolioData = {
      ...portfolio_data,
      current_stocks_pct:
        portfolio_data.current_stocks_pct ??
        portfolio_data.stocks_pct ??
        portfolio_data.stockspct ??
        50,
      current_bonds_pct:
        portfolio_data.current_bonds_pct ??
        portfolio_data.bonds_pct ??
        portfolio_data.bondspct ??
        50,
    };

    state.predictions = predictions;
    state.metrics = portfolio_metrics;

    displayUserInfo(state.portfolioData);
    displayMetrics(portfolio_metrics);
    displayComparisonTable(predictions);
    await selectModel("dnn");

    const empty = document.getElementById("empty-state");
    const pred = document.getElementById("predictions-container");
    const health = document.getElementById("health-panel");
    const fin = document.getElementById("financial-panel");
    const cmp = document.getElementById("comparison-panel");
    const applyBtn = document.getElementById("apply-btn");

    if (empty) empty.classList.add("hidden");
    if (pred) pred.classList.remove("hidden");
    if (health) health.style.display = "block";
    if (fin) fin.style.display = "block";
    if (cmp) cmp.style.display = "block";
    if (applyBtn) applyBtn.classList.remove("hidden");

    showToast(`Loaded User ${userId}`, "success");
  } catch (error) {
    console.error("Error loading user", error?.response ?? error);
    showToast("Failed to load user portfolio", "error");
  } finally {
    showLoader(false);
  }
}

// ================== USER INFO ==================
function displayUserInfo(data) {
  document.getElementById("user-name").textContent =
    data.userid || "User";

  // Age
  const age = data.age;
  if (age != null) {
    document.getElementById("user-age").textContent = `${age} years`;
  } else {
    document.getElementById("user-age").textContent = "-";
  }

  // Years to retirement (target age 65)
  const RETIRE_AGE = 65;
  let yrs = null;
  if (typeof age === "number") {
    yrs = Math.max(0, RETIRE_AGE - age);
  }
  document.getElementById("user-retirement").textContent =
    yrs != null ? `${yrs} years` : "-";

  // Risk (leave existing logic)
  document.getElementById("user-risk").textContent = "moderate";

  // Portfolio value
  if (data.networth != null) {
    document.getElementById("user-portfolio").textContent =
      (data.networth / 1000).toFixed(0) + "K";
  } else {
    document.getElementById("user-portfolio").textContent = "-";
  }

  // Wellness score
  const wellness =
    data.wellness_score != null ? data.wellness_score : data.wellnessscore;
  if (wellness != null) {
    document.getElementById("user-wellness").textContent = (
      wellness * 100
    ).toFixed(0);
  } else {
    document.getElementById("user-wellness").textContent = "-";
  }

  document.getElementById("user-info").classList.remove("hidden");
}


// ================== METRICS ==================
function displayMetrics(metrics) {
  if (!metrics) return;

  const health = metrics.health_score || {};
  const wellnessPct = (health.wellness ?? 0) * 100;
  const cardioPct = (health.cardio_health ?? 0) * 100;

  // health bars + numbers
  document.getElementById("wellness-bar").style.width = `${wellnessPct}%`;
  document.getElementById("wellness-value").textContent =
    wellnessPct.toFixed(0) + "/100";

  document.getElementById("cardio-bar").style.width = `${cardioPct}%`;
  document.getElementById("cardio-value").textContent =
    cardioPct.toFixed(0) + "/100";

  document.getElementById("heart-value").textContent =
    health.heart_rate != null ? `${health.heart_rate} bpm` : "–";
  document.getElementById("hrv-value").textContent =
    health.hrv != null ? `${health.hrv} ms` : "–";

  // financial metrics
  document.getElementById("annual-return").textContent =
    metrics.annual_return != null ? metrics.annual_return.toFixed(2) : "–";
  document.getElementById("volatility").textContent =
    metrics.volatility != null ? metrics.volatility.toFixed(2) : "–";
  document.getElementById("sharpe-ratio").textContent =
    metrics.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(4) : "–";

  const rawMaxDD =
    metrics.max_drawdown != null
      ? metrics.max_drawdown
      : state.portfolioData?.max_drawdown ?? null;

  const maxDD =
    rawMaxDD != null ? Number(rawMaxDD) : null;

  document.getElementById("max-drawdown").textContent =
    maxDD != null && !Number.isNaN(maxDD) ? maxDD.toFixed(2) : "–";

  updateHealthCharts(metrics);
  updateFinancialCharts(metrics);
}

// ================== MODEL SELECTION ==================
async function selectModel(modelType) {
  state.currentModel = modelType;

  document.querySelectorAll(".model-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.model === modelType) btn.classList.add("active");
  });

  const prediction =
    state.predictions && state.predictions[modelType];

  if (prediction) {
    displayPrediction(prediction);
    displayBeforeAfterInsights(prediction);
    updateBeforeAfterCharts(prediction);
    updateChart();
    updateSelectedModelChart();
  }

  const descriptions = {
    mpt: "Modern Portfolio Theory. Classical finance-based allocation using age and wellness.",
    dnn: "Deep Neural Network. AI-powered recommendation using all features (primary).",
    rl: "Reinforcement Learning. Market-adaptive strategy that reacts to regimes.",
    ensemble: "Ensemble. Consensus of MPT, DNN and RL for robust recommendations.",
  };
  const descEl = document.getElementById("model-description");
  if (descEl) {
    descEl.textContent =
      descriptions[modelType] || "Select a model to see predictions.";
  }
}

// ================== PREDICTION PANEL ==================
function displayPrediction(prediction) {
  const stocks = prediction.stocks_percentage;
  const bonds = prediction.bonds_percentage;
  const confidence = prediction.confidence ?? 0;

  document.getElementById("pred-model-name").textContent = prediction.model;
  document.getElementById("pred-confidence").textContent =
    (confidence * 100).toFixed(0) + "%";

  document.getElementById("stocks-bar").style.width = `${stocks}%`;
  document.getElementById("bonds-bar").style.width = `${bonds}%`;

  document
    .getElementById("stocks-bar")
    .querySelector(".bar-label").textContent = `${stocks.toFixed(1)}%`;
  document
    .getElementById("bonds-bar")
    .querySelector(".bar-label").textContent = `${bonds.toFixed(1)}%`;

  document.getElementById("pred-stocks").textContent =
    `${stocks.toFixed(1)}%`;
  document.getElementById("pred-bonds").textContent =
    `${bonds.toFixed(1)}%`;
  const curStocks = state.portfolioData.current_stocks_pct ?? 50;
  const curBonds = state.portfolioData.current_bonds_pct ?? 50;
  document.getElementById("current-alloc").textContent =
    `${curStocks.toFixed(1)} / ${curBonds.toFixed(1)}`;
  document.getElementById("optimized-alloc").textContent =
    `${stocks.toFixed(1)} / ${bonds.toFixed(1)}`;
}

// ================== BEFORE/AFTER TEXT ==================
function displayBeforeAfterInsights(prediction) {
  const originalStocks = state.portfolioData.current_stocks_pct ?? 50;
  const originalBonds = state.portfolioData.current_bonds_pct ?? 50;
  const newStocks = prediction.stocks_percentage;
  const newBonds = prediction.bonds_percentage;

  const beforeStocksEl = document.getElementById("before-stocks");
  const beforeBondsEl = document.getElementById("before-bonds");
  const afterStocksEl = document.getElementById("after-stocks");
  const afterBondsEl = document.getElementById("after-bonds");

  // If those spans don’t exist in the DOM, just skip updating them
  if (
    !beforeStocksEl ||
    !beforeBondsEl ||
    !afterStocksEl ||
    !afterBondsEl
  ) {
    return;
  }

  beforeStocksEl.textContent = originalStocks.toFixed(1) + "%";
  beforeBondsEl.textContent = originalBonds.toFixed(1) + "%";
  afterStocksEl.textContent = newStocks.toFixed(1) + "%";
  afterBondsEl.textContent = newBonds.toFixed(1) + "%";
}

// ================== BEFORE/AFTER CHARTS ==================
function updateBeforeAfterCharts(prediction) {
  const data = state.portfolioData;
  if (!data) return;

  const curStocks = data.current_stocks_pct ?? 50;
  const curBonds = data.current_bonds_pct ?? 50;
  const optStocks = prediction.stocks_percentage;
  const optBonds = prediction.bonds_percentage;

  const currentCtx = document.getElementById("current-allocation-chart");
  const optimizedCtx = document.getElementById("optimized-allocation-chart");
  if (!currentCtx || !optimizedCtx || !window.Chart) return;

  if (currentAllocChart) currentAllocChart.destroy();
  if (optimizedAllocChart) optimizedAllocChart.destroy();

  currentAllocChart = new Chart(currentCtx, {
    type: "doughnut",
    data: {
      labels: ["Stocks", "Bonds"],
      datasets: [
        {
          data: [curStocks, curBonds],
          backgroundColor: ["#0ea5e9", "#e5e7eb"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${curStocks.toFixed(1)} / ${curBonds.toFixed(1)}`,
          font: { size: 11 },
        },
      },
      cutout: "65%",
    },
  });

  optimizedAllocChart = new Chart(optimizedCtx, {
    type: "doughnut",
    data: {
      labels: ["Stocks", "Bonds"],
      datasets: [
        {
          data: [optStocks, optBonds],
          backgroundColor: ["#22c55e", "#e5e7eb"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${optStocks.toFixed(1)} / ${optBonds.toFixed(1)}`,
          font: { size: 11 },
        },
      },
      cutout: "65%",
    },
  });
}

// ================== COMPARISON TABLE ==================
function displayComparisonTable(predictions) {
  const tbody = document.getElementById("comparison-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  Object.values(predictions).forEach((pred) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${pred.model}</td>
      <td>${pred.stocks_percentage.toFixed(2)}%</td>
      <td>${pred.bonds_percentage.toFixed(2)}%</td>
      <td>${(pred.confidence * 100).toFixed(0)}%</td>
      <td>${pred.description}</td>
    `;
  });
}

// ================== STUBS FOR EXTRA CHARTS ==================
// ================== HEALTH CHARTS ==================
// Health charts: show balance of wellness vs cardio vs stress index (derived)
function updateHealthCharts(metrics) {
  const health = metrics.health_score || {};
  const ctxRadar = document.getElementById("health-radar-chart");
  const ctxVitals = document.getElementById("vitals-line-chart");
  if (!window.Chart || !ctxRadar || !ctxVitals) return;

  // Destroy old charts
  if (healthRadarChart) healthRadarChart.destroy();
  if (vitalsLineChart) vitalsLineChart.destroy();

  const wellness = (health.wellness ?? 0) * 100;
  const cardio = (health.cardio_health ?? 0) * 100;
  // Derived “strain” index: high HR and low HRV = more strain
  const hr = health.heart_rate ?? 0;
  const hrv = health.hrv ?? 0;
  const strain = Math.min(100, Math.max(0, hr - hrv * 50));

  // Radar: show relative balance
  healthRadarChart = new Chart(ctxRadar, {
    type: "radar",
    data: {
      labels: ["Wellness", "Cardio", "Strain"],
      datasets: [
        {
          data: [wellness, cardio, strain],
          backgroundColor: "rgba(59,130,246,0.16)",
          borderColor: "#3b82f6",
          pointBackgroundColor: "#3b82f6",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { stepSize: 25 },
          grid: { color: "rgba(148,163,184,0.3)" },
        },
      },
    },
  });

  // Vitals: normalize both to 0–100 scale for visual comparison
  const normHr = Math.min(200, Math.max(40, hr));
  const normHrv = Math.min(2, Math.max(0, hrv));
  const hrScore = ((normHr - 40) / 160) * 100;
  const hrvScore = (normHrv / 2) * 100;

  vitalsLineChart = new Chart(ctxVitals, {
    type: "line",
    data: {
      labels: ["Heart rate", "HRV"],
      datasets: [
        {
          data: [hrScore, hrvScore],
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14,165,233,0.2)",
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100 },
        x: { grid: { display: false } },
      },
    },
  });
}


// ================== FINANCIAL CHARTS ==================
// Financial chart: show profile shape, not just raw numbers
function updateFinancialCharts(metrics) {
  const ctx = document.getElementById("risk-return-chart");
  if (!window.Chart || !ctx) return;

  if (riskReturnChart) riskReturnChart.destroy();

  const ann = metrics.annual_return ?? 0;
  const vol = metrics.volatility ?? 0;
  const sharpe = metrics.sharpe_ratio ?? 0;
  const maxDD = metrics.max_drawdown ?? 0;

  // Normalize metrics to a comparable scale (rough heuristics)
  const annScore = ann * 100;             // ~ -5 to +5
  const volScore = vol * 1000;           // small decimals → 0–10
  const sharpeScore = sharpe * 20;       // 0.0–1.0 → 0–20
  const ddScore = maxDD;                 // already % scale (negative)

  riskReturnChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Return", "Volatility", "Sharpe", "Drawdown"],
      datasets: [
        {
          data: [annScore, volScore, sharpeScore, ddScore],
          backgroundColor: "rgba(16,185,129,0.16)",
          borderColor: "#10b981",
          pointBackgroundColor: "#10b981",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          ticks: { display: false },
          grid: { color: "rgba(148,163,184,0.3)" },
        },
      },
    },
  });
}

// ================== ALLOCATION COMPARISON (all models) ==================
function updateChart() {
  const ctx = document.getElementById("comparison-chart");
  if (!ctx || !window.Chart || !state.predictions || !state.portfolioData) {
    return;
  }

  // Destroy existing chart if any
  if (window.allocationComparisonChart) {
    window.allocationComparisonChart.destroy();
  }

  const models = ["mpt", "dnn", "rl", "ensemble"].filter(
    (m) => state.predictions[m]
  );

  const stockValues = models.map(
    (m) => state.predictions[m].stocks_percentage
  );
  const bondValues = models.map(
    (m) => state.predictions[m].bonds_percentage
  );
  const currentStocks = state.portfolioData.current_stocks_pct ?? 50;
  const currentBonds = state.portfolioData.current_bonds_pct ?? 50;

  window.allocationComparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: models.map((m) => m.toUpperCase()),
      datasets: [
        {
          label: "Stocks",
          data: stockValues,
          backgroundColor: "#22c55e",
        },
        {
          label: "Bonds",
          data: bondValues,
          backgroundColor: "#e5e7eb",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: {
          display: true,
          text: `Current: ${currentStocks.toFixed(
            1
          )}% / ${currentBonds.toFixed(1)}%`,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

// ================== SELECTED MODEL BREAKDOWN (single model) ==================
function updateSelectedModelChart() {
  const ctx = document.getElementById("selected-model-chart");
  if (!ctx || !window.Chart || !state.predictions || !state.currentModel) {
    return;
  }

  const pred = state.predictions[state.currentModel];
  if (!pred) return;

  if (window.selectedModelChart) {
    window.selectedModelChart.destroy();
  }

  const stocks = pred.stocks_percentage;
  const bonds = pred.bonds_percentage;

  window.selectedModelChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Stocks", "Bonds"],
      datasets: [
        {
          data: [stocks, bonds],
          backgroundColor: ["#22c55e", "#e5e7eb"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "bottom" },
        title: {
          display: true,
          text: `${state.currentModel.toUpperCase()} allocation`,
        },
      },
      cutout: "60%",
    },
  });
}

function applyAllocation() {
  showToast("Allocation applied (demo only).", "success");
}

// ================== LOADER & TOAST ==================
function showLoader(show) {
  const body = document.body;
  if (!body) return;
  if (show) body.classList.add("loading");
  else body.classList.remove("loading");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}
