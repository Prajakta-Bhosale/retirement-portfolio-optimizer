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

// ================== HELPERS ==================
function toTitleCase(str) {
  if (!str) return "-";
  return String(str)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Simple frontend risk-level heuristic using portfolio metrics
function computeRiskLevel(portfolioData, metrics) {
  const stocksPct =
    portfolioData?.current_stocks_pct != null
      ? Number(portfolioData.current_stocks_pct)
      : null;

  if (stocksPct != null && !Number.isNaN(stocksPct)) {
    if (stocksPct < 40) return "Low";
    if (stocksPct > 70) return "High";
    // Always moderate when between 40 and 70
    return "Moderate";
  }

  // Fallback if stocks % missing
  return "Moderate";
}



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

    // Filter users by age <= 65 (requires portfolio fetch)
    const filtered = [];
    for (const id of userids) {
      if (filtered.length >= 100) break;
      try {
        const pResp = await axios.get(API_ENDPOINTS.portfolio(id));
        const age = pResp.data?.user_profile?.age;
        if (typeof age === "number" && age <= 65) {
          filtered.push(id);
        }
      } catch (e) {
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
    const { user_profile, portfolio_data, health_summary, predictions } =
      response.data;

    // Flatten into structure expected by UI
    state.portfolioData = {
      userid: user_profile.userid,
      age: user_profile.age,
      networth: portfolio_data.financial?.income_wealth?.net_worth ?? null,
      wellness_score: health_summary.wellness_score,
      wellnessscore: health_summary.wellness_score,
      current_stocks_pct:
        portfolio_data.allocation?.current_allocation?.stocks_pct ?? 50,
      current_bonds_pct:
        portfolio_data.allocation?.current_allocation?.bonds_pct ?? 50,
      max_drawdown: portfolio_data.performance?.risk_metrics?.max_drawdown ?? null,
    };

    // Metrics for health + finance panels (now includes heart rate & HRV)
    state.metrics = {
      health_score: {
        wellness: health_summary.wellness_score,
        cardio_health: health_summary.cardio_health,
        heart_rate: health_summary.heart_rate_avg,
        hrv: health_summary.hrv,
        stress_level: health_summary.stress_level,
      },
      annual_return:
        portfolio_data.performance?.returns?.annual_return ?? null,
      volatility:
        portfolio_data.performance?.volatility?.portfolio_volatility ?? null,
      sharpe_ratio:
        portfolio_data.performance?.risk_metrics?.sharpe_ratio ?? null,
      max_drawdown:
        portfolio_data.performance?.risk_metrics?.max_drawdown ?? null,
    };

    state.predictions = predictions;

    displayUserInfo(state.portfolioData);
    displayMetrics(state.metrics);
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
  document.getElementById("user-name").textContent = data.userid || "User";

  const age = data.age;
  if (age != null) {
    document.getElementById("user-age").textContent = `${age} years`;
  } else {
    document.getElementById("user-age").textContent = "-";
  }

  const RETIRE_AGE = 65;
  let yrs = null;
  if (typeof age === "number") {
    yrs = Math.max(0, RETIRE_AGE - age);
  }
  document.getElementById("user-retirement").textContent =
    yrs != null ? `${yrs} years` : "-";

  // --- Compute and show risk level based on frontend metrics ---
  const risk = computeRiskLevel(state.portfolioData, state.metrics);
  document.getElementById("user-risk").textContent = toTitleCase(risk);

  if (data.networth != null) {
    document.getElementById("user-portfolio").textContent =
      (data.networth / 1000).toFixed(0) + "K";
  } else {
    document.getElementById("user-portfolio").textContent = "-";
  }

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

  // heart rate / HRV widgets
  const hr = health.heart_rate;
  const hrv = health.hrv;
  document.getElementById("heart-value").textContent =
    hr != null ? `${hr.toFixed(0)} bpm` : "–";
  document.getElementById("hrv-value").textContent =
    hrv != null ? `${hrv.toFixed(3)} ms` : "–";

  // financial metrics
  document.getElementById("annual-return").textContent =
    metrics.annual_return != null ? metrics.annual_return.toFixed(4) : "–";
  document.getElementById("volatility").textContent =
    metrics.volatility != null ? metrics.volatility.toFixed(4) : "–";
  document.getElementById("sharpe-ratio").textContent =
    metrics.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(4) : "–";

  const rawMaxDD =
    metrics.max_drawdown != null
      ? metrics.max_drawdown
      : state.portfolioData?.max_drawdown ?? null;
  const maxDD = rawMaxDD != null ? Number(rawMaxDD) : null;
  document.getElementById("max-drawdown").textContent =
    maxDD != null && !Number.isNaN(maxDD) ? maxDD.toFixed(2) : "–";

  // charts
  updateHealthCharts(metrics);
  updateFinancialCharts(metrics);
}

// ================== HEALTH CHARTS ==================
function updateHealthCharts(metrics) {
  if (!window.Chart || !metrics) return;

  const health = metrics.health_score || {};
  const wellness = (health.wellness ?? 0) * 100;
  const cardio = (health.cardio_health ?? 0) * 100;
  const stress =
    health.stress_level != null ? 100 - health.stress_level * 100 : 50;

  const barCtx = document.getElementById("health-radar-chart");
  if (barCtx) {
    if (healthRadarChart) healthRadarChart.destroy();

    const normalizeScore = (value) => {
      const numValue = Number(value) || 0;
      return Math.max(0, Math.min(100, numValue));
    };

    const getScoreColor = (value) => {
      const numValue = Number(value) || 0;
      const spectrum = [
        "#7f1d1d",
        "#b91c1c",
        "#dc2626",
        "#ef4444",
        "#f97316",
        "#fb923c",
        "#fbbf24",
        "#facc15",
        "#eab308",
        "#65a30d",
        "#22c55e",
        "#16a34a",
        "#15803d",
        "#10b981",
        "#047857",
      ];
      const normalized = Math.max(
        0,
        Math.min(14, ((numValue + 100) / 200) * 14)
      );
      const index = Math.floor(normalized);
      return spectrum[index] || spectrum[spectrum.length - 1];
    };

    const wVal = normalizeScore(wellness);
    const cVal = normalizeScore(cardio);
    const sVal = normalizeScore(stress);

    const barColors = [
      getScoreColor(wVal),
      getScoreColor(cVal),
      getScoreColor(sVal),
    ];

    healthRadarChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: ["Wellness", "Cardio", "Stress Level"],
        datasets: [
          {
            label: "Health Score",
            data: [wVal, cVal, sVal],
            backgroundColor: barColors,
            borderRadius: 6,
            borderSkipped: false,
            borderWidth: 0,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: "rgba(50, 184, 198, 0.15)",
            },
            ticks: {
              color: "#9ca3af",
              font: { size: 10 },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: "#d1d5db",
              font: { size: 11, weight: "500" },
            },
          },
        },
      },
    });
  }

  const lineCtx = document.getElementById("vitals-line-chart");
  if (lineCtx) {
    if (vitalsLineChart) vitalsLineChart.destroy();

    const hr = health.heart_rate ?? 70;
    const hrv = health.hrv ?? 40;
    const labels = ["T-3", "T-2", "T-1", "Now"];
    const heartSeries = [hr * 0.9, hr * 0.95, hr * 0.98, hr];
    const hrvSeries = [hrv * 0.8, hrv * 0.9, hrv * 0.95, hrv];

    vitalsLineChart = new Chart(lineCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Heart Rate",
            data: heartSeries,
            borderColor: "#a855f7",
            backgroundColor: "rgba(168, 85, 247, 0.1)",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#a855f7",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 5,
            borderWidth: 3,
          },
          {
            label: "HRV",
            data: hrvSeries,
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#06b6d4",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 5,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#d1d5db",
              font: { size: 11, weight: "500" },
              padding: 10,
              usePointStyle: true,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#9ca3af",
              font: { size: 10 },
            },
          },
          y: {
            grid: {
              color: "rgba(50, 184, 198, 0.15)",
            },
            ticks: {
              color: "#9ca3af",
              font: { size: 10 },
            },
          },
        },
      },
    });
  }
}

// ================== FINANCIAL CHARTS ==================
function updateFinancialCharts(metrics) {
  if (!window.Chart || !metrics) return;

  const ret = metrics.annual_return ?? 0;
  const vol = metrics.volatility ?? 0;
  const sharpe = metrics.sharpe_ratio ?? 0;

  const ctx = document.getElementById("risk-return-chart");
  if (!ctx) return;

  if (riskReturnChart) riskReturnChart.destroy();

  riskReturnChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Annual return", "Volatility", "Sharpe ratio"],
      datasets: [
        {
          label: "Value",
          data: [ret, vol, sharpe],
          backgroundColor: [
            "rgba(34, 197, 94, 0.6)",
            "rgba(59, 130, 246, 0.6)",
            "rgba(234, 179, 8, 0.6)",
          ],
          borderColor: [
            "rgba(34, 197, 94, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(234, 179, 8, 1)",
          ],
          borderWidth: 1.5,
          borderRadius: 8,
          barThickness: 30,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const label = ctx.label;
              const v = ctx.raw;
              if (label === "Annual return") return (v * 100).toFixed(2) + "%";
              if (label === "Volatility") return v.toFixed(4);
              if (label === "Sharpe ratio") return v.toFixed(4);
              return v;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(148, 163, 184, 0.2)" } },
      },
    },
  });
}

// ================== MODEL SELECTION ==================
async function selectModel(modelType) {
  state.currentModel = modelType;

  document.querySelectorAll(".model-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.model === modelType) {
      btn.classList.add("active");
    }
  });

  if (!state.predictions || !state.portfolioData) return;

  const prediction = state.predictions[modelType];
  if (prediction) {
    const curStocks = state.portfolioData.current_stocks_pct ?? 50;
    displayPrediction(prediction);
    displayBeforeAfterInsights(prediction);
    updateBeforeAfterCharts(prediction);
    updateSelectedModelChart();
    generateDynamicExplanation(
      prediction,
      curStocks,
      prediction.stocks_percentage
    );

    const descriptions = {
      mpt: "Modern Portfolio Theory. Classical finance-based allocation using age and wellness.",
      dnn: "Deep Neural Network. AI-powered recommendation using all features (primary).",
      rl: "Reinforcement Learning. Market-adaptive strategy that reacts to regimes.",
      ensemble:
        "Ensemble. Consensus of MPT, DNN and RL for robust recommendations.",
    };

    const descEl = document.getElementById("model-description");
    if (descEl) {
      descEl.textContent =
        descriptions[modelType] || "Select a model to see predictions.";
    }
  }
}

// ================== PREDICTION PANEL ==================
function displayPrediction(prediction) {
  const stocks = prediction.stocks_percentage;
  const bonds = prediction.bonds_percentage;
  const confidence = prediction.confidence ?? 0;

  const modelFullNames = {
    MPT: "MPT Modern Portfolio Theory - CLASSICAL",
    DNN: "DNN Deep Neural Network - PRIMARY",
    RL: "RL Reinforcement Learning - ADAPTIVE",
    Ensemble: "Ensemble Ensemble - CONSENSUS",
  };
  const fullName =
    modelFullNames[prediction.model] || prediction.model || "Model";

  document.getElementById("pred-model-name").textContent = fullName;
  document.getElementById("pred-confidence").textContent = (
    confidence * 100
  ).toFixed(0);

  document.getElementById("stocks-bar").style.width = `${stocks}%`;
  document.getElementById("bonds-bar").style.width = `${bonds}%`;

  document
    .getElementById("stocks-bar")
    .querySelector(".bar-label").textContent = stocks.toFixed(1);
  document
    .getElementById("bonds-bar")
    .querySelector(".bar-label").textContent = bonds.toFixed(1);

  const predStocksEl = document.getElementById("pred-stocks");
  const predBondsEl = document.getElementById("pred-bonds");
  if (predStocksEl) predStocksEl.textContent = stocks.toFixed(1);
  if (predBondsEl) predBondsEl.textContent = bonds.toFixed(1);

  const curStocks = state.portfolioData.current_stocks_pct ?? 50;
  const curBonds = state.portfolioData.current_bonds_pct ?? 50;

  document.getElementById(
    "current-alloc"
  ).textContent = `${curStocks.toFixed(1)} Stocks / ${curBonds.toFixed(1)} Bonds`;
  document.getElementById(
    "optimized-alloc"
  ).textContent = `${stocks.toFixed(1)} Stocks / ${bonds.toFixed(1)} Bonds`;
}

// ================== EXPLANATION ==================
function generateDynamicExplanation(prediction, currentStocks, recommendedStocks) {
  const data = state.portfolioData;
  const metrics = state.metrics;
  const model = prediction.model || "The model";

  if (!data) {
    console.warn("Portfolio data is null, cannot generate explanation");
    return;
  }

  const age = data.age ?? 0;
  const wellness = data.wellness_score ?? 0;
  const changeStocks = recommendedStocks - currentStocks;
  const changeAbs = Math.abs(changeStocks).toFixed(1);

  let explanation = "";

  if (age < 35) {
    explanation = `At age ${age}, you have substantial time until retirement. `;
  } else if (age < 50) {
    explanation = `At age ${age}, you're in your prime earning years with moderate time until retirement. `;
  } else if (age < 65) {
    explanation = `At age ${age}, you're approaching retirement and should focus on capital preservation. `;
  } else {
    explanation =
      "As you're at or past traditional retirement age, capital preservation is critical. ";
  }

  if (wellness >= 0.8) {
    explanation += `Your excellent wellness score ${(wellness * 100).toFixed(
      0
    )}/100 indicates you can tolerate market volatility. `;
  } else if (wellness >= 0.6) {
    explanation += `Your good wellness score ${(wellness * 100).toFixed(
      0
    )}/100 suggests moderate risk capacity. `;
  } else {
    explanation += `Your wellness score ${(wellness * 100).toFixed(
      0
    )}/100 suggests a more conservative approach is prudent. `;
  }

  if (changeStocks > 2) {
    explanation += `${model} recommends a ${changeAbs}% increase in stocks for growth potential. `;
  } else if (changeStocks < -2) {
    explanation += `${model} recommends a ${changeAbs}% decrease in stocks to reduce risk exposure. `;
  } else {
    explanation += `${model} suggests maintaining your current allocation as it aligns well with your profile. `;
  }

  const confidence = (prediction.confidence ?? 0) * 100;
  if (confidence >= 90) {
    explanation += `The ${confidence.toFixed(
      0
    )}% confidence level indicates strong conviction in this recommendation.`;
  } else if (confidence >= 75) {
    explanation += `The ${confidence.toFixed(
      0
    )}% confidence level shows solid conviction in this strategy.`;
  } else {
    explanation += `The ${confidence.toFixed(
      0
    )}% confidence level suggests reasonable alignment with your profile, though some uncertainty remains.`;
  }

  const explanationEl = document.getElementById("explanation-text");
  if (explanationEl) {
    explanationEl.textContent = explanation;
  } else {
    console.warn("Explanation element #explanation-text not found in DOM");
  }
}

// ================== BEFORE–AFTER TEXT ==================
function displayBeforeAfterInsights(prediction) {
  const originalStocks = state.portfolioData.current_stocks_pct ?? 50;
  const originalBonds = state.portfolioData.current_bonds_pct ?? 50;
  const newStocks = prediction.stocks_percentage;
  const newBonds = prediction.bonds_percentage;

  const beforeStocksEl = document.getElementById("before-stocks");
  const beforeBondsEl = document.getElementById("before-bonds");
  const afterStocksEl = document.getElementById("after-stocks");
  const afterBondsEl = document.getElementById("after-bonds");

  if (!beforeStocksEl || !beforeBondsEl || !afterStocksEl || !afterBondsEl)
    return;

  beforeStocksEl.textContent = originalStocks.toFixed(1);
  beforeBondsEl.textContent = originalBonds.toFixed(1);
  afterStocksEl.textContent = newStocks.toFixed(1);
  afterBondsEl.textContent = newBonds.toFixed(1);
}

// ================== BEFORE–AFTER CHARTS ==================
function updateBeforeAfterCharts(prediction) {
  const data = state.portfolioData;
  if (!data || !window.Chart) return;

  const curStocks = data.current_stocks_pct ?? 50;
  const curBonds = data.current_bonds_pct ?? 50;
  const optStocks = prediction.stocks_percentage;
  const optBonds = prediction.bonds_percentage;

  const currentCtx = document.getElementById("current-allocation-chart");
  const optimizedCtx = document.getElementById("optimized-allocation-chart");
  if (!currentCtx || !optimizedCtx) return;

  if (currentAllocChart) currentAllocChart.destroy();
  if (optimizedAllocChart) optimizedAllocChart.destroy();

  const stocksColor = "#3b82f6";
  const bondsColor = "#10b981";

  const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart) {
      const {
        ctx,
        chartArea: { left, top, width, height },
      } = chart;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const stocks = chart.data.datasets[0].data[0];

      ctx.save();
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#f3f4f6";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stocks.toFixed(1), centerX, centerY - 12);

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("Stocks", centerX, centerY + 12);
      ctx.restore();
    },
  };

  currentAllocChart = new Chart(currentCtx, {
    type: "doughnut",
    data: {
      labels: ["Stocks", "Bonds"],
      datasets: [
        {
          data: [curStocks, curBonds],
          backgroundColor: [stocksColor, bondsColor],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            font: { size: 12, weight: "500" },
            padding: 15,
            usePointStyle: true,
            color: "#d1d5db",
          },
        },
      },
      cutout: "65%",
    },
    plugins: [centerTextPlugin],
  });

  optimizedAllocChart = new Chart(optimizedCtx, {
    type: "doughnut",
    data: {
      labels: ["Stocks", "Bonds"],
      datasets: [
        {
          data: [optStocks, optBonds],
          backgroundColor: [stocksColor, bondsColor],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            font: { size: 12, weight: "500" },
            padding: 15,
            usePointStyle: true,
            color: "#d1d5db",
          },
        },
      },
      cutout: "65%",
    },
    plugins: [centerTextPlugin],
  });
}

// In your current UI this just keeps doughnut charts in sync
function updateSelectedModelChart() {
  // no-op for now
}

// ================== COMPARISON TABLE ==================
function displayComparisonTable(predictions) {
  const tbody =
    document.getElementById("comparison-body") ||
    document.getElementById("comparison-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  Object.values(predictions).forEach((pred) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${pred.model}</td>
      <td>${pred.stocks_percentage.toFixed(1)}</td>
      <td>${pred.bonds_percentage.toFixed(1)}</td>
      <td>${((pred.confidence ?? 0) * 100).toFixed(0)}</td>
      <td>${pred.description}</td>
    `;
  });
}

// ================== APPLY (demo only) ==================
async function applyAllocation() {
  showToast("Demo only, no changes applied.", "warning");
}

// ================== LOADER & TOAST ==================
let toastTimeout = null;

function showLoader(show) {
  const loader = document.getElementById("loader");
  if (!loader) return;
  loader.classList.toggle("hidden", !show);
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast";
  if (type) toast.classList.add(type);
  toast.classList.add("show");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
