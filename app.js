const APP_VERSION = "__APP_VERSION__" === "__APP_VERSION__" ? "dev-local" : "__APP_VERSION__";
const DATA_VERSION = APP_VERSION;

const loader = document.getElementById("loader");
const legendEl = document.getElementById("legend");
const topTableBody = document.querySelector("#topTable tbody");
const weightsNormEl = document.getElementById("weightsNorm");
const weightTotalEl = document.getElementById("weightTotal");
const activePresetEl = document.getElementById("activePreset");
const mapStatus = document.getElementById("mapStatus");
const mapModeButtons = [...document.querySelectorAll("[data-map-mode]")];
const scenarioNarrativeLead = document.getElementById("scenarioNarrativeLead");
const scenarioNarrativeTags = document.getElementById("scenarioNarrativeTags");
const scenarioNarrativeBody = document.getElementById("scenarioNarrativeBody");
const contextPanel = document.getElementById("contextPanel");
const contextClose = document.getElementById("contextClose");
const contextCard = document.getElementById("contextCard");
const contextTitle = document.getElementById("contextTitle");
const contextRank = document.getElementById("contextRank");
const contextScore = document.getElementById("contextScore");
const contextPhi = document.getElementById("contextPhi");
const contextElig = document.getElementById("contextElig");
const contextSelected = document.getElementById("contextSelected");
const contextNarrative = document.getElementById("contextNarrative");
const contextPillars = document.getElementById("contextPillars");

const sliders = {
  E: document.getElementById("wE"),
  A: document.getElementById("wA"),
  C: document.getElementById("wC"),
  R: document.getElementById("wR"),
  N: document.getElementById("wN"),
};
const sliderVals = {
  E: document.getElementById("wE_val"),
  A: document.getElementById("wA_val"),
  C: document.getElementById("wC_val"),
  R: document.getElementById("wR_val"),
  N: document.getElementById("wN_val"),
};
const internalPillarConfigs = {
  E: {
    label: "Energy",
    topField: "P_E",
    keys: ["E1", "E2", "E3"],
    fields: { E1: "E1_score", E2: "E2_score", E3: "E3_score" },
    sliders: {
      E1: document.getElementById("e1w"),
      E2: document.getElementById("e2w"),
      E3: document.getElementById("e3w"),
    },
    sliderVals: {
      E1: document.getElementById("e1w_val"),
      E2: document.getElementById("e2w_val"),
      E3: document.getElementById("e3w_val"),
    },
    totalEl: document.getElementById("energyWeightTotal"),
    normEl: document.getElementById("energyWeightsNorm"),
    toggleEl: document.getElementById("energySubpillarToggle"),
    bodyEl: document.getElementById("energySubpillarBody"),
    defaultValues: { E1: 33.4, E2: 33.3, E3: 33.3 },
  },
  A: {
    label: "Agricultural intensity",
    topField: "P_A",
    keys: ["A1", "A2", "A3"],
    fields: { A1: "A1_score", A2: "A2_score", A3: "A3_score" },
    sliders: {
      A1: document.getElementById("a1w"),
      A2: document.getElementById("a2w"),
      A3: document.getElementById("a3w"),
    },
    sliderVals: {
      A1: document.getElementById("a1w_val"),
      A2: document.getElementById("a2w_val"),
      A3: document.getElementById("a3w_val"),
    },
    totalEl: document.getElementById("agriWeightTotal"),
    normEl: document.getElementById("agriWeightsNorm"),
    toggleEl: document.getElementById("agriSubpillarToggle"),
    bodyEl: document.getElementById("agriSubpillarBody"),
    defaultValues: { A1: 33.4, A2: 33.3, A3: 33.3 },
  },
  C: {
    label: "Climate resilience",
    topField: "P_C",
    keys: ["C1", "C2", "C3"],
    fields: { C1: "c1", C2: "c2", C3: "c3" },
    sliders: {
      C1: document.getElementById("c1w"),
      C2: document.getElementById("c2w"),
      C3: document.getElementById("c3w"),
    },
    sliderVals: {
      C1: document.getElementById("c1w_val"),
      C2: document.getElementById("c2w_val"),
      C3: document.getElementById("c3w_val"),
    },
    totalEl: document.getElementById("climateWeightTotal"),
    normEl: document.getElementById("climateWeightsNorm"),
    toggleEl: document.getElementById("climateSubpillarToggle"),
    bodyEl: document.getElementById("climateSubpillarBody"),
    defaultValues: { C1: 33.4, C2: 33.3, C3: 33.3 },
  },
  R: {
    label: "Rural resilience",
    topField: "P_R",
    keys: ["R1", "R2", "R3"],
    fields: { R1: "R1_TF_score", R2: "R2_SAU_score", R3: "R3_PBS_score" },
    sliders: {
      R1: document.getElementById("r1w"),
      R2: document.getElementById("r2w"),
      R3: document.getElementById("r3w"),
    },
    sliderVals: {
      R1: document.getElementById("r1w_val"),
      R2: document.getElementById("r2w_val"),
      R3: document.getElementById("r3w_val"),
    },
    totalEl: document.getElementById("ruralWeightTotal"),
    normEl: document.getElementById("ruralWeightsNorm"),
    toggleEl: document.getElementById("ruralSubpillarToggle"),
    bodyEl: document.getElementById("ruralSubpillarBody"),
    defaultValues: { R1: 33.4, R2: 33.3, R3: 33.3 },
  },
  N: {
    label: "Nature conservation",
    topField: "P_N",
    keys: ["N1", "N2", "N3"],
    fields: { N1: "N1_hedges_mm", N2: "N2_pp_mm", N3: "N3_forest_mm" },
    sliders: {
      N1: document.getElementById("n1w"),
      N2: document.getElementById("n2w"),
      N3: document.getElementById("n3w"),
    },
    sliderVals: {
      N1: document.getElementById("n1w_val"),
      N2: document.getElementById("n2w_val"),
      N3: document.getElementById("n3w_val"),
    },
    totalEl: document.getElementById("natureWeightTotal"),
    normEl: document.getElementById("natureWeightsNorm"),
    toggleEl: document.getElementById("natureSubpillarToggle"),
    bodyEl: document.getElementById("natureSubpillarBody"),
    defaultValues: { N1: 33.4, N2: 33.3, N3: 33.3 },
  },
};
const applyPhi = document.getElementById("applyPhi");
const targetHa = document.getElementById("targetHa");
const targetHaVal = document.getElementById("targetHa_val");
const mobilizationPct = document.getElementById("mobilizationPct");
const mobilizationPctVal = document.getElementById("mobilizationPct_val");
const density = document.getElementById("density");
const densityVal = document.getElementById("density_val");
const topPct = document.getElementById("topPct");
const topPctVal = document.getElementById("topPct_val");

const kpiCount = document.getElementById("kpiCount");
const kpiArea = document.getElementById("kpiArea");
const kpiCap = document.getElementById("kpiCap");
const kpiE = document.getElementById("kpiE");
const weightKeys = ["E", "A", "C", "R", "N"];
const presetButtons = [...document.querySelectorAll("[data-preset]")];
const internalPillarKeys = Object.keys(internalPillarConfigs);

const PRESETS = {
  balanced: { label: "Balanced", values: [20, 20, 20, 20, 20] },
  energy: { label: "Energy-first", values: [100, 0, 0, 0, 0] },
  agronomy: { label: "Agricultural-intensity-first", values: [0, 100, 0, 0, 0] },
  climate: { label: "Climate-first", values: [0, 0, 100, 0, 0] },
  rural: { label: "Rural-first", values: [0, 0, 0, 100, 0] },
  nature: { label: "Nature-first", values: [0, 0, 0, 0, 100] },
  bau: { label: "BAU (E/A 50–50)", values: [50, 50, 0, 0, 0] },
};

let map;
let attrs = [];
let globalPvoutMedian = 1250;
let currentThreshold = 0.8;
let currentSelectionThreshold = 0.8;
let usingPmtiles = true;
let currentPreset = "balanced";
let currentMapMode = "merit";
let selectedCommuneInsee = null;
let fallbackToGeoJSON = null;
const FR_BOUNDS = [
  [-5.8, 41.0],
  [9.8, 51.6],
];

function withVersion(path) {
  const url = new URL(path, window.location.href);
  url.searchParams.set("v", DATA_VERSION);
  return url.href;
}

function fmtNum(x, d = 2) {
  return Number(x).toLocaleString("fr-FR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtPct(x, d = 0) {
  return `${fmtNum(x, d)}%`;
}

function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}

function getRawWeights() {
  return Object.fromEntries(weightKeys.map((k) => [k, Number(sliders[k].value)]));
}

function getRawInternalWeights(pillarKey) {
  const cfg = internalPillarConfigs[pillarKey];
  return Object.fromEntries(cfg.keys.map((k) => [k, Number(cfg.sliders[k].value)]));
}

function internalMixIsDefault(pillarKey) {
  const cfg = internalPillarConfigs[pillarKey];
  return cfg.keys.every((k) => Math.abs(Number(cfg.sliders[k].value) - Number(cfg.defaultValues[k])) < 1e-6);
}

function anyInternalMixCustomized() {
  return internalPillarKeys.some((pillarKey) => !internalMixIsDefault(pillarKey));
}

function getWeightStep() {
  return Number(sliders[weightKeys[0]].step || 1);
}

function getInternalWeightStep(pillarKey) {
  const cfg = internalPillarConfigs[pillarKey];
  return Number(cfg.sliders[cfg.keys[0]].step || 1);
}

function clampWeight(value) {
  return Math.max(0, Math.min(100, Number(value)));
}

function quantizeWeight(value) {
  const step = getWeightStep();
  const units = Math.round(clampWeight(value) / step);
  return Number((units * step).toFixed(6));
}

function getWeights() {
  const raw = getRawWeights();
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { E: 0.2, A: 0.2, C: 0.2, R: 0.2, N: 0.2 };
  return Object.fromEntries(weightKeys.map((k) => [k, raw[k] / sum]));
}

function getInternalWeights(pillarKey) {
  const cfg = internalPillarConfigs[pillarKey];
  const raw = getRawInternalWeights(pillarKey);
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return Object.fromEntries(cfg.keys.map((k) => [k, 1 / cfg.keys.length]));
  return Object.fromEntries(cfg.keys.map((k) => [k, raw[k] / sum]));
}

function setPresetState(name) {
  currentPreset = name;
  const label = PRESETS[name]?.label || "Custom";
  activePresetEl.textContent = `Active profile: ${label}`;
  presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === name);
  });
}

function detectPresetName() {
  const current = weightKeys.map((k) => Number(sliders[k].value));
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (preset.values.every((value, idx) => Math.abs(value - current[idx]) < 1e-6)) {
      return name;
    }
  }
  return "custom";
}

function rebalanceWeights(changedKey, changedValue) {
  rebalanceSliderGroup(weightKeys, sliders, getRawWeights(), getWeightStep(), changedKey, changedValue);
}

function rebalanceInternalWeights(pillarKey, changedKey, changedValue) {
  const cfg = internalPillarConfigs[pillarKey];
  rebalanceSliderGroup(cfg.keys, cfg.sliders, getRawInternalWeights(pillarKey), getInternalWeightStep(pillarKey), changedKey, changedValue);
}

function rebalanceSliderGroup(keys, sliderGroup, raw, step, changedKey, changedValue) {
  const v = quantizeWeight(changedValue);
  raw[changedKey] = v;

  const others = keys.filter((k) => k !== changedKey);
  const targetOthers = 100 - v;
  const currentOthers = others.map((k) => raw[k]);
  const sumOthers = currentOthers.reduce((a, b) => a + b, 0);
  const targetUnits = Math.round(targetOthers / step);

  let newOthers;
  if (sumOthers <= 0) {
    const baseUnits = Math.floor(targetUnits / others.length);
    let remUnits = targetUnits - baseUnits * others.length;
    newOthers = others.map(() => {
      const add = remUnits > 0 ? 1 : 0;
      remUnits -= add;
      return Number(((baseUnits + add) * step).toFixed(6));
    });
  } else {
    const scaledUnits = currentOthers.map((x) => (x / sumOthers) * targetUnits);
    const flooredUnits = scaledUnits.map((x) => Math.floor(x));
    let remUnits = targetUnits - flooredUnits.reduce((a, b) => a + b, 0);
    const fracOrder = scaledUnits
      .map((x, i) => ({ i, frac: x - flooredUnits[i] }))
      .sort((a, b) => b.frac - a.frac);
    for (let t = 0; t < fracOrder.length && remUnits > 0; t += 1) {
      flooredUnits[fracOrder[t].i] += 1;
      remUnits -= 1;
    }
    newOthers = flooredUnits.map((units) => Number((units * step).toFixed(6)));
  }

  sliderGroup[changedKey].value = v.toFixed(1);
  others.forEach((k, i) => {
    sliderGroup[k].value = newOthers[i].toFixed(1);
  });
}

function updateLabels() {
  for (const k of weightKeys) sliderVals[k].textContent = Number(sliders[k].value).toFixed(1);
  for (const pillarKey of internalPillarKeys) {
    const cfg = internalPillarConfigs[pillarKey];
    for (const key of cfg.keys) cfg.sliderVals[key].textContent = Number(cfg.sliders[key].value).toFixed(1);
    const total = Object.values(getRawInternalWeights(pillarKey)).reduce((a, b) => a + b, 0);
    cfg.totalEl.textContent = `${total.toFixed(1)}%`;
    const weights = getInternalWeights(pillarKey);
    cfg.normEl.textContent = cfg.keys.map((key) => `${key} ${weights[key].toFixed(2)}`).join(" | ");
  }
  targetHaVal.textContent = targetHa.value;
  mobilizationPctVal.textContent = Number(mobilizationPct.value).toFixed(1);
  densityVal.textContent = Number(density.value).toFixed(2);
  topPctVal.textContent = topPct.value;
  const total = Object.values(getRawWeights()).reduce((a, b) => a + b, 0);
  weightTotalEl.textContent = `${total.toFixed(1)}%`;
  const w = getWeights();
  weightsNormEl.textContent = `E ${w.E.toFixed(2)} | A ${w.A.toFixed(2)} | C ${w.C.toFixed(2)} | R ${w.R.toFixed(2)} | N ${w.N.toFixed(2)}`;
  setPresetState(detectPresetName());
}

function setMapMode(mode) {
  currentMapMode = mode === "selection" ? "selection" : "merit";
  mapModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mapMode === currentMapMode);
  });
  if (attrs.length) {
    renderLegendFromState();
    refreshMapStyling();
  }
}

function setSubpillarOpen(pillarKey, open) {
  const cfg = internalPillarConfigs[pillarKey];
  cfg.bodyEl.classList.toggle("hidden", !open);
  cfg.toggleEl.setAttribute("aria-expanded", open ? "true" : "false");
}

function computeInternalPillar(row, pillarKey) {
  const cfg = internalPillarConfigs[pillarKey];
  const weights = getInternalWeights(pillarKey);
  const values = cfg.keys.map((key) => Number(row[cfg.fields[key]]));
  if (!values.every(Number.isFinite)) return Number(row[cfg.topField]) || 0;
  return cfg.keys.reduce((sum, key) => sum + weights[key] * Number(row[cfg.fields[key]]), 0);
}

function getPillarValue(row, pillarKey) {
  if (internalPillarConfigs[pillarKey]) return computeInternalPillar(row, pillarKey);
  return Number(row[`P_${pillarKey}`]) || 0;
}

function pillarExpr(pillarKey) {
  const cfg = internalPillarConfigs[pillarKey];
  if (!cfg) return ["coalesce", ["get", `P_${pillarKey}`], 0];
  const weights = getInternalWeights(pillarKey);
  const hasAll = ["all", ...cfg.keys.map((key) => ["has", cfg.fields[key]])];
  const weightedTerms = ["+", ...cfg.keys.map((key) => ["*", weights[key], ["coalesce", ["get", cfg.fields[key]], 0]])];
  return ["case", hasAll, weightedTerms, ["coalesce", ["get", cfg.topField], 0]];
}

function scenarioMeaning(w, target, area, outputTWh) {
  const dominant = pillarDefinitions()
    .map((p) => ({ ...p, weight: w[p.key] }))
    .sort((a, b) => b.weight - a.weight);
  const lead = dominant[0];
  const second = dominant[1];
  const topShare = Math.round(lead.weight * 100);
  const secondShare = Math.round(second.weight * 100);
  const targetShort = target >= 100000 ? `${Math.round(target / 1000)}k ha` : `${target.toLocaleString("fr-FR")} ha`;

  let leadText = `This configuration primarily prioritizes ${lead.label.toLowerCase()}, with ${topShare}% of the utility weight attached to that pillar.`;
  if (lead.weight < 0.35) {
    leadText = "This configuration stays relatively balanced across the five pillars, without a single overwhelming objective.";
  } else if (second.weight > 0.15) {
    leadText += ` A secondary emphasis remains on ${second.label.toLowerCase()} (${secondShare}%).`;
  }

  const tags = [];
  if (lead.weight >= 0.5) tags.push(`${lead.label}-led`);
  else tags.push("Multi-objective");
  if (applyPhi.checked) tags.push("Feasibility-aware");
  if (target >= 100000) tags.push("Large deployment target");
  else tags.push("Early deployment tranche");

  const body = `${leadText} At the current settings, the app fills a ${targetShort} deployment portfolio, selecting ${fmtNum(
    attrs.filter((r) => r._selected).length,
    0,
  )} municipalities for ${fmtNum(area, 0)} ha and about ${fmtNum(outputTWh, 3)} TWh/year. Use the map clicks to see which local pillar mix explains a municipality's position in that portfolio.`;

  return { lead: leadText, tags, body };
}

function contributionBreakdown(row, w) {
  return pillarDefinitions().map((p) => {
    const raw = getPillarValue(row, p.key);
    const weighted = raw * w[p.key];
    return {
      ...p,
      raw,
      weighted,
    };
  });
}

function updateScenarioNarrative(area, outputTWh) {
  const w = getWeights();
  const target = Number(targetHa.value);
  const meaning = scenarioMeaning(w, target, area, outputTWh);
  scenarioNarrativeLead.textContent = meaning.lead;
  scenarioNarrativeBody.textContent = meaning.body;
  scenarioNarrativeTags.innerHTML = meaning.tags.map((tag) => `<span class="narrative-tag">${tag}</span>`).join("");
}

function setContextPanel(row) {
  if (!row) {
    contextPanel.classList.add("hidden");
    return;
  }

  const w = getWeights();
  const breakdown = contributionBreakdown(row, w).sort((a, b) => b.weighted - a.weighted);
  const best = breakdown[0];
  const selectedText = row._selected
    ? `Yes — ${fmtNum(row._take_ha || 0, 0)} ha allocated`
    : "No — below current cut-off";

  contextPanel.classList.remove("hidden");
  contextTitle.textContent = `${row.name} (${row.insee})`;
  contextRank.textContent = `Rank ${fmtNum((row._rank || 0), 0)}`;
  contextScore.textContent = row._score?.toFixed(3) ?? "-";
  contextPhi.textContent = fmtNum(row.phi ?? 0, 3);
  contextElig.textContent = `${fmtNum(row.ELIG_HA || 0, 0)} ha`;
  contextSelected.textContent = selectedText;
  contextNarrative.textContent = `${best.label} contributes the most to this municipality's current utility score. ${
    row._selected
      ? "It is currently inside the selected deployment portfolio."
      : "It remains visible on the map, but it is not captured by the current deployment tranche."
  }`;
  contextPillars.innerHTML = breakdown
    .map(
      (part) => `<div class="pillar-bar">
        <span class="pillar-bar__label">${part.label}</span>
        <div class="pillar-bar__track"><div class="pillar-bar__fill" style="width:${Math.max(4, part.raw * 100)}%"></div></div>
        <span class="pillar-bar__value">${fmtPct(part.raw * 100, 0)}</span>
      </div>`,
    )
    .join("");
}

function computeScore(row, w, withPhi) {
  let u =
    w.E * getPillarValue(row, "E") +
    w.A * getPillarValue(row, "A") +
    w.C * getPillarValue(row, "C") +
    w.R * getPillarValue(row, "R") +
    w.N * getPillarValue(row, "N");
  if (withPhi) u *= row.phi;
  return u;
}

function scoreExpr(w, withPhi) {
  const linear = [
    "+",
    ["*", w.E, pillarExpr("E")],
    ["*", w.A, pillarExpr("A")],
    ["*", w.C, pillarExpr("C")],
    ["*", w.R, pillarExpr("R")],
    ["*", w.N, pillarExpr("N")],
  ];
  return withPhi ? ["*", linear, ["coalesce", ["get", "phi"], 0]] : linear;
}

function renderLegendFromState() {
  const scores = attrs.map((r) => r._score).filter((v) => Number.isFinite(v));
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 1;

  if (currentMapMode === "selection") {
    legendEl.innerHTML = `
      <strong>Selection outcome</strong><br/>
      <small>Bright fills mark municipalities selected under the current deployment settings.</small>
      <div class="legend-chip-row">
        <span class="legend-chip"><span class="legend-chip__swatch legend-chip__swatch--selected"></span>Selected</span>
        <span class="legend-chip"><span class="legend-chip__swatch legend-chip__swatch--unselected"></span>Not selected</span>
      </div>
      Selection cut-off score: ${currentSelectionThreshold.toFixed(3)}<br/>
      Selected municipalities: ${fmtNum(attrs.filter((r) => r._selected).length, 0)}
    `;
    return;
  }

  legendEl.innerHTML = `
    <strong>Merit-order score</strong><br/>
    <small>Bright outlines mark municipalities above the visual top threshold.</small>
    <div class="legend-scale"></div>
    Min: ${min.toFixed(3)}<br/>
    Max: ${max.toFixed(3)}<br/>
    Top ${topPct.value}% threshold: ${currentThreshold.toFixed(3)}
  `;
}

function refreshMapStyling() {
  if (!map || !map.getLayer("communes-fill")) return;
  const w = getWeights();
  const expr = scoreExpr(w, applyPhi.checked);
  if (currentMapMode === "selection") {
    map.setPaintProperty("communes-fill", "fill-color", [
      "case",
      [">=", expr, currentSelectionThreshold],
      "#7af0a4",
      "#182233",
    ]);
    map.setPaintProperty("communes-fill", "fill-opacity", [
      "case",
      [">=", expr, currentSelectionThreshold],
      0.86,
      0.26,
    ]);
    map.setPaintProperty("communes-line", "line-width", ["case", [">=", expr, currentSelectionThreshold], 1.1, 0.0]);
    map.setPaintProperty("communes-line", "line-color", ["case", [">=", expr, currentSelectionThreshold], "#d7ffe8", "#000000"]);
    mapStatus.textContent = `Selection-outcome view · ${usingPmtiles ? "PMTiles / MapLibre rendering" : "GeoJSON fallback mode"}`;
    return;
  }

  map.setPaintProperty("communes-fill", "fill-color", [
    "interpolate",
    ["linear"],
    expr,
    0.0, "#09101b",
    0.2, "#17345f",
    0.4, "#146b8f",
    0.6, "#10b8b7",
    0.8, "#a5f04b",
    1.0, "#fff27a",
  ]);
  map.setPaintProperty("communes-fill", "fill-opacity", [
    "interpolate",
    ["linear"],
    expr,
    0.0, 0.22,
    1.0, 0.88,
  ]);
  map.setPaintProperty("communes-line", "line-width", ["case", [">=", expr, currentThreshold], 1.25, 0.0]);
  map.setPaintProperty("communes-line", "line-color", ["case", [">=", expr, currentThreshold], "#ff7a59", "#000000"]);
  mapStatus.textContent = `Merit-order view · ${usingPmtiles ? "PMTiles / MapLibre rendering" : "GeoJSON fallback mode"}`;
}

function refreshScenarioAndKPIs() {
  if (!attrs.length) return;

  const w = getWeights();
  const withPhi = applyPhi.checked;
  const target = Number(targetHa.value);
  const m = Number(mobilizationPct.value) / 100;
  const dens = Number(density.value);

  for (const r of attrs) {
    r._score = computeScore(r, w, withPhi);
    r._selected = false;
    r._take_ha = 0;
  }
  attrs.sort((a, b) => b._score - a._score);
  attrs.forEach((r, idx) => {
    r._rank = idx + 1;
  });

  const scores = attrs.map((r) => r._score).filter((v) => Number.isFinite(v));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  currentThreshold = quantile(scores, 1 - Number(topPct.value) / 100) ?? 0;

  let remain = target;
  let area = 0;
  let capMWp = 0;
  let eKWh = 0;
  let n = 0;

  for (const r of attrs) {
    if (remain <= 0) break;
    const elig = Number(r.ELIG_HA || 0);
    if (!(elig > 0)) continue;
    const deployable = m * elig;
    if (deployable <= 0) continue;
    const take = Math.min(remain, deployable);
    if (take <= 0) continue;
    r._selected = true;
    r._take_ha = take;
    remain -= take;
    n += 1;
    area += take;
    const cap = take * dens;
    capMWp += cap;
    const pvout = Number.isFinite(r.pvout) ? r.pvout : globalPvoutMedian;
    eKWh += cap * 1000 * pvout;
  }

  const selectedScores = attrs.filter((r) => r._selected).map((r) => r._score).filter((v) => Number.isFinite(v));
  currentSelectionThreshold = selectedScores.length ? Math.min(...selectedScores) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(currentSelectionThreshold)) currentSelectionThreshold = max + 1e-6;

  kpiCount.textContent = fmtNum(n, 0);
  kpiArea.textContent = fmtNum(area, 0);
  kpiCap.textContent = fmtNum(capMWp / 1000, 2);
  kpiE.textContent = fmtNum(eKWh / 1e9, 3);
  updateScenarioNarrative(area, eKWh / 1e9);

  topTableBody.innerHTML = attrs
    .slice(0, 15)
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${r.name}${r._selected ? " <span style='color:#a5f04b'>&#9679;</span>" : ""}</td>
        <td>${r._score.toFixed(3)}</td>
        <td>${fmtNum(r.ELIG_HA || 0, 0)}</td>
      </tr>`
    )
    .join("");

  const selectedRow = selectedCommuneInsee ? attrs.find((r) => r.insee === selectedCommuneInsee) : null;
  setContextPanel(selectedRow || null);
  if (usingPmtiles && anyInternalMixCustomized() && typeof fallbackToGeoJSON === "function") {
    fallbackToGeoJSON("custom sub-indicator view requires GeoJSON source");
  }
  renderLegendFromState();
  refreshMapStyling();
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  [sliders.E.value, sliders.A.value, sliders.C.value, sliders.R.value, sliders.N.value] = preset.values.map(String);
  setPresetState(name);
  updateLabels();
  refreshScenarioAndKPIs();
}

function findRowFromFeatureProperties(properties) {
  const insee = String(properties?.insee || properties?.INSEE_COM || properties?.code_insee || "");
  if (!insee) return null;
  return attrs.find((row) => row.insee === insee) || null;
}

let refreshTimer = null;
function refreshDebounced() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshScenarioAndKPIs, 80);
}

async function fetchJson(path) {
  const response = await fetch(withVersion(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

function buildMapStyle(pmtilesUrl) {
  return {
    version: 8,
    sources: {
      dark: {
        type: "raster",
        tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO",
      },
      communes: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
      },
    },
    layers: [
      { id: "dark", type: "raster", source: "dark" },
      {
        id: "communes-fill",
        type: "fill",
        source: "communes",
        "source-layer": "communes",
        paint: {
          "fill-color": "#146b8f",
          "fill-opacity": 0.72,
        },
      },
      {
        id: "communes-line",
        type: "line",
        source: "communes",
        "source-layer": "communes",
        paint: {
          "line-color": "#ff7a59",
          "line-width": 0.0,
          "line-opacity": 0.98,
        },
      },
    ],
  };
}

async function init() {
  loader.textContent = "Loading scenario attributes…";
  mapStatus.textContent = "Fetching latest assets";

  attrs = await fetchJson("./data/communes_attrs.json");
  attrs = attrs.map((r) => ({
    insee: String(r.insee),
    name: r.name || r.commune_name || r.insee,
    dep: String(r.dep),
    P_E: Number(r.P_E),
    E1_score: Number(r.E1_score),
    E2_score: Number(r.E2_score),
    E3_score: Number(r.E3_score),
    P_A: Number(r.P_A),
    A1_score: Number(r.A1_score),
    A2_score: Number(r.A2_score),
    A3_score: Number(r.A3_score),
    P_C: Number(r.P_C),
    c1: Number(r.c1),
    c2: Number(r.c2),
    c3: Number(r.c3),
    P_R: Number(r.P_R),
    R1_TF_score: Number(r.R1_TF_score),
    R2_SAU_score: Number(r.R2_SAU_score),
    R3_PBS_score: Number(r.R3_PBS_score),
    P_N: Number(r.P_N),
    N1_hedges_mm: Number(r.N1_hedges_mm),
    N2_pp_mm: Number(r.N2_pp_mm),
    N3_forest_mm: Number(r.N3_forest_mm),
    phi: Number(r.phi),
    ELIG_HA: Number(r.ELIG_HA || 0),
    pvout: Number(r.pvout),
  }));

  const pv = attrs.map((r) => r.pvout).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (pv.length) globalPvoutMedian = pv[Math.floor(pv.length / 2)];

  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  const pmtilesUrl = withVersion("./data/communes.pmtiles");
  const pmtilesSource = new pmtiles.PMTiles(pmtilesUrl);
  protocol.add(pmtilesSource);

  map = new maplibregl.Map({
    container: "map",
    style: buildMapStyle(pmtilesUrl),
    center: [2.2, 46.7],
    zoom: 5.4,
    minZoom: 4,
    maxZoom: 12,
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  let fallbackTriggered = false;
  fallbackToGeoJSON = async function (reason) {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    usingPmtiles = false;
    console.warn("PMTiles fallback -> GeoJSON:", reason);
    loader.classList.remove("hidden");
    loader.textContent = "PMTiles unavailable, loading GeoJSON fallback…";
    mapStatus.textContent = currentMapMode === "selection"
      ? "Selection-outcome view · GeoJSON fallback mode"
      : "Merit-order view · GeoJSON fallback mode";

    try {
      const gj = await fetchJson("./data/communes_pillars.geojson");
      if (map.getSource("communes")) {
        if (map.getLayer("communes-line")) map.removeLayer("communes-line");
        if (map.getLayer("communes-fill")) map.removeLayer("communes-fill");
        map.removeSource("communes");
      }
      map.addSource("communes", { type: "geojson", data: gj });
      map.addLayer({
        id: "communes-fill",
        type: "fill",
        source: "communes",
        paint: { "fill-color": "#146b8f", "fill-opacity": 0.72 },
      });
      map.addLayer({
        id: "communes-line",
        type: "line",
        source: "communes",
        paint: { "line-color": "#ff7a59", "line-width": 0.0, "line-opacity": 0.98 },
      });
      refreshScenarioAndKPIs();
      loader.classList.add("hidden");
    } catch (err) {
      console.error("Fallback GeoJSON failed:", err);
      loader.textContent = "Map layers could not be loaded.";
      mapStatus.textContent = "Load error";
    }
  };

  map.on("error", (ev) => {
    const msg = String(ev?.error?.message || "");
    if (msg.toLowerCase().includes("pmtiles") || msg.toLowerCase().includes("source")) {
      fallbackToGeoJSON(msg);
    }
  });

  map.on("load", () => {
    updateLabels();
    refreshScenarioAndKPIs();
    map.fitBounds(FR_BOUNDS, {
      padding: window.innerWidth > 1160
        ? { top: 28, right: 54, bottom: 28, left: 54 }
        : { top: 24, right: 24, bottom: 24, left: 24 },
      maxZoom: 7.2,
      duration: 0,
    });
    map.resize();
    loader.classList.add("hidden");
    mapStatus.textContent = currentMapMode === "selection"
      ? `Selection-outcome view · ${usingPmtiles ? "PMTiles / MapLibre rendering" : "GeoJSON fallback mode"}`
      : `Merit-order view · ${usingPmtiles ? "PMTiles / MapLibre rendering" : "GeoJSON fallback mode"}`;

    if (usingPmtiles) {
      setTimeout(() => {
        try {
          const hasSource = !!map.getSource("communes");
          if (!hasSource) fallbackToGeoJSON("communes source unavailable");
        } catch (e) {
          fallbackToGeoJSON(e);
        }
      }, 2500);
    }
  });

  map.on("click", "communes-fill", (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const p = f.properties;
    const row = findRowFromFeatureProperties(p) || {
      insee: String(p.insee || p.INSEE_COM || ""),
      name: p.name || p.nom || p.insee,
      P_E: Number(p.P_E),
      E1_score: Number(p.E1_score),
      E2_score: Number(p.E2_score),
      E3_score: Number(p.E3_score),
      P_A: Number(p.P_A),
      A1_score: Number(p.A1_score),
      A2_score: Number(p.A2_score),
      A3_score: Number(p.A3_score),
      P_C: Number(p.P_C),
      c1: Number(p.c1),
      c2: Number(p.c2),
      c3: Number(p.c3),
      P_R: Number(p.P_R),
      R1_TF_score: Number(p.R1_TF_score),
      R2_SAU_score: Number(p.R2_SAU_score),
      R3_PBS_score: Number(p.R3_PBS_score),
      P_N: Number(p.P_N),
      N1_hedges_mm: Number(p.N1_hedges_mm),
      N2_pp_mm: Number(p.N2_pp_mm),
      N3_forest_mm: Number(p.N3_forest_mm),
      phi: Number(p.phi),
      ELIG_HA: Number(p.ELIG_HA || 0),
      pvout: Number(p.pvout || globalPvoutMedian),
    };
    selectedCommuneInsee = row.insee || null;
    setContextPanel(row);

    new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
      .setLngLat(e.lngLat)
      .setHTML(
        `<strong>${row.name || row.insee}</strong> (${row.insee})<br/>
         Score: <strong>${(row._score ?? computeScore(row, getWeights(), applyPhi.checked)).toFixed(3)}</strong><br/>
         ELIG_HA: ${fmtNum(Number(row.ELIG_HA || 0), 1)} ha<br/>
         PVOUT: ${fmtNum(Number(row.pvout || globalPvoutMedian), 0)} kWh/kWp/year`,
      )
      .addTo(map);
  });

  window.addEventListener("resize", () => {
    if (!map) return;
    map.resize();
  });
}

weightKeys.forEach((k) => {
  sliders[k].addEventListener("input", (ev) => {
    rebalanceWeights(k, ev.target.value);
    setPresetState("custom");
    updateLabels();
    refreshDebounced();
  });
});
internalPillarKeys.forEach((pillarKey) => {
  const cfg = internalPillarConfigs[pillarKey];
  cfg.keys.forEach((key) => {
    cfg.sliders[key].addEventListener("input", (ev) => {
      rebalanceInternalWeights(pillarKey, key, ev.target.value);
      updateLabels();
      refreshDebounced();
    });
  });
  cfg.toggleEl.addEventListener("click", () => {
    const isOpen = cfg.toggleEl.getAttribute("aria-expanded") === "true";
    setSubpillarOpen(pillarKey, !isOpen);
  });
});
for (const el of [applyPhi, targetHa, mobilizationPct, density, topPct]) {
  el.addEventListener("input", () => {
    updateLabels();
    refreshDebounced();
  });
}
presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});
mapModeButtons.forEach((button) => {
  button.addEventListener("click", () => setMapMode(button.dataset.mapMode));
});
contextClose.addEventListener("click", () => setContextPanel(null));

internalPillarKeys.forEach((pillarKey) => setSubpillarOpen(pillarKey, false));
init().catch((error) => {
  console.error(error);
  loader.textContent = "The application failed to initialize.";
  mapStatus.textContent = "Initialization error";
});
