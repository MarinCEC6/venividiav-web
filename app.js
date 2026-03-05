const loader = document.getElementById("loader");
const legendEl = document.getElementById("legend");
const topTableBody = document.querySelector("#topTable tbody");

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
const applyPhi = document.getElementById("applyPhi");
const weightsNormEl = document.getElementById("weightsNorm");
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

let map;
let attrs = [];
let globalPvoutMedian = 1250;
let currentThreshold = 0.8;
let usingPmtiles = true;
const FR_BOUNDS = [
  [-5.8, 41.0], // southwest [lon, lat]
  [9.8, 51.6],  // northeast [lon, lat]
];

function fmtNum(x, d = 2) {
  return Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}

function getWeights() {
  const raw = {
    E: Number(sliders.E.value),
    A: Number(sliders.A.value),
    C: Number(sliders.C.value),
    R: Number(sliders.R.value),
    N: Number(sliders.N.value),
  };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { E: 0.2, A: 0.2, C: 0.2, R: 0.2, N: 0.2 };
  return {
    E: raw.E / sum,
    A: raw.A / sum,
    C: raw.C / sum,
    R: raw.R / sum,
    N: raw.N / sum,
  };
}

function updateLabels() {
  for (const k of Object.keys(sliders)) sliderVals[k].textContent = sliders[k].value;
  targetHaVal.textContent = targetHa.value;
  mobilizationPctVal.textContent = Number(mobilizationPct.value).toFixed(1);
  densityVal.textContent = Number(density.value).toFixed(2);
  topPctVal.textContent = topPct.value;
  const w = getWeights();
  weightsNormEl.textContent = `E=${w.E.toFixed(2)}, A=${w.A.toFixed(2)}, C=${w.C.toFixed(2)}, R=${w.R.toFixed(2)}, N=${w.N.toFixed(2)}`;
}

function computeScore(row, w, withPhi) {
  let u = w.E * row.P_E + w.A * row.P_A + w.C * row.P_C + w.R * row.P_R + w.N * row.P_N;
  if (withPhi) u *= row.phi;
  return u;
}

function scoreExpr(w, withPhi) {
  const linear = [
    "+",
    ["*", w.E, ["coalesce", ["get", "P_E"], 0]],
    ["*", w.A, ["coalesce", ["get", "P_A"], 0]],
    ["*", w.C, ["coalesce", ["get", "P_C"], 0]],
    ["*", w.R, ["coalesce", ["get", "P_R"], 0]],
    ["*", w.N, ["coalesce", ["get", "P_N"], 0]],
  ];
  return withPhi ? ["*", linear, ["coalesce", ["get", "phi"], 0]] : linear;
}

function refreshScenarioAndKPIs() {
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

  const scores = attrs.map((r) => r._score).filter((v) => Number.isFinite(v));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  currentThreshold = quantile(scores, 1 - Number(topPct.value) / 100);

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

  kpiCount.textContent = fmtNum(n, 0);
  kpiArea.textContent = fmtNum(area, 0);
  kpiCap.textContent = fmtNum(capMWp / 1000, 2);
  kpiE.textContent = fmtNum(eKWh / 1e9, 3);

  topTableBody.innerHTML = attrs
    .slice(0, 15)
    .map(
      (r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${r.name}</td>
      <td>${r._score.toFixed(3)}</td>
      <td>${fmtNum(r.ELIG_HA || 0, 0)}</td>
    </tr>`
    )
    .join("");

  legendEl.innerHTML = `
    <strong>Score utilité communal</strong><br/>
    <div class="legend-scale"></div>
    Min: ${min.toFixed(3)}<br/>
    Max: ${max.toFixed(3)}<br/>
    Seuil Top ${topPct.value}%: ${currentThreshold.toFixed(3)}<br/>
    Bordure rouge: communes au-dessus du seuil visuel.
  `;

  if (map && map.getLayer("communes-fill")) {
    const expr = scoreExpr(w, withPhi);
    map.setPaintProperty("communes-fill", "fill-color", [
      "interpolate",
      ["linear"],
      expr,
      0,
      "#e8f6f3",
      0.5,
      "#2a9d8f",
      1,
      "#1d3557",
    ]);
    map.setPaintProperty("communes-line", "line-width", [
      "case",
      [">=", expr, currentThreshold],
      0.6,
      0.0,
    ]);
  }
}

function applyPreset(name) {
  const presets = {
    balanced: [20, 20, 20, 20, 20],
    energy: [100, 0, 0, 0, 0],
    agronomy: [0, 100, 0, 0, 0],
    climate: [0, 0, 100, 0, 0],
    rural: [0, 0, 0, 100, 0],
    nature: [0, 0, 0, 0, 100],
    bau: [50, 50, 0, 0, 0],
  };
  const p = presets[name];
  if (!p) return;
  sliders.E.value = p[0];
  sliders.A.value = p[1];
  sliders.C.value = p[2];
  sliders.R.value = p[3];
  sliders.N.value = p[4];
  updateLabels();
  refreshScenarioAndKPIs();
}

let refreshTimer = null;
function refreshDebounced() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshScenarioAndKPIs, 120);
}

async function init() {
  // Load lightweight attributes table for scenario computation
  const attrsResp = await fetch("./data/communes_attrs.json");
  attrs = await attrsResp.json();
  attrs = attrs.map((r) => ({
    insee: String(r.insee),
    name: r.name || r.commune_name || r.insee,
    dep: String(r.dep),
    P_E: Number(r.P_E),
    P_A: Number(r.P_A),
    P_C: Number(r.P_C),
    P_R: Number(r.P_R),
    P_N: Number(r.P_N),
    phi: Number(r.phi),
    ELIG_HA: Number(r.ELIG_HA || 0),
    pvout: Number(r.pvout),
  }));
  const pv = attrs.map((r) => r.pvout).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (pv.length) globalPvoutMedian = pv[Math.floor(pv.length / 2)];

  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  const pmtilesUrl = new URL("./data/communes.pmtiles", window.location.href).href;
  const p = new pmtiles.PMTiles(pmtilesUrl);
  protocol.add(p);

  map = new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
        communes: {
          type: "vector",
          url: `pmtiles://${pmtilesUrl}`,
        },
      },
      layers: [
        { id: "osm", type: "raster", source: "osm" },
        {
          id: "communes-fill",
          type: "fill",
          source: "communes",
          "source-layer": "communes",
          paint: {
            "fill-color": "#8ab6c9",
            "fill-opacity": 0.72,
          },
        },
        {
          id: "communes-line",
          type: "line",
          source: "communes",
          "source-layer": "communes",
          paint: {
            "line-color": "#e63946",
            "line-width": 0.0,
            "line-opacity": 0.95,
          },
        },
      ],
    },
    center: [2.2, 46.7],
    zoom: 5.4,
    minZoom: 4,
    maxZoom: 12,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  let fallbackTriggered = false;
  async function fallbackToGeoJSON(reason) {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    usingPmtiles = false;
    console.warn("PMTiles fallback -> GeoJSON:", reason);
    loader.classList.remove("hidden");
    loader.textContent = "PMTiles indisponible, chargement GeoJSON de secours...";
    try {
      const resp = await fetch("./data/communes_pillars.geojson");
      const gj = await resp.json();
      if (map.getSource("communes")) {
        map.removeLayer("communes-line");
        map.removeLayer("communes-fill");
        map.removeSource("communes");
      }
      map.addSource("communes", { type: "geojson", data: gj });
      map.addLayer({
        id: "communes-fill",
        type: "fill",
        source: "communes",
        paint: { "fill-color": "#8ab6c9", "fill-opacity": 0.72 },
      });
      map.addLayer({
        id: "communes-line",
        type: "line",
        source: "communes",
        paint: { "line-color": "#e63946", "line-width": 0.0, "line-opacity": 0.95 },
      });
      refreshScenarioAndKPIs();
      loader.classList.add("hidden");
    } catch (err) {
      console.error("Fallback GeoJSON failed:", err);
      loader.textContent = "Erreur de chargement des couches cartographiques.";
    }
  }

  map.on("error", (ev) => {
    const msg = String(ev?.error?.message || "");
    if (msg.toLowerCase().includes("pmtiles") || msg.toLowerCase().includes("source")) {
      fallbackToGeoJSON(msg);
    }
  });

  map.on("load", () => {
    updateLabels();
    refreshScenarioAndKPIs();
    // Force an initial viewport centered on metropolitan France
    map.fitBounds(FR_BOUNDS, {
      padding: { top: 20, right: 20, bottom: 20, left: 420 }, // left padding for control panel
      maxZoom: 7.2,
      duration: 0,
    });
    map.resize();
    loader.classList.add("hidden");
    if (usingPmtiles) {
      // If source is still not readable shortly after load, trigger fallback.
      setTimeout(() => {
        try {
          const hasSource = !!map.getSource("communes");
          if (!hasSource) fallbackToGeoJSON("communes source unavailable");
        } catch (e) {
          fallbackToGeoJSON(e);
        }
      }, 3000);
    }
  });

  window.addEventListener("resize", () => {
    if (!map) return;
    map.resize();
  });

  map.on("click", "communes-fill", (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const p = f.properties;
    const w = getWeights();
    const score = computeScore(
      {
        P_E: Number(p.P_E),
        P_A: Number(p.P_A),
        P_C: Number(p.P_C),
        P_R: Number(p.P_R),
        P_N: Number(p.P_N),
        phi: Number(p.phi),
      },
      w,
      applyPhi.checked
    );
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(
        `<strong>${p.name || p.insee}</strong> (${p.insee})<br/>
         Score: <strong>${score.toFixed(3)}</strong><br/>
         ELIG_HA: ${fmtNum(Number(p.ELIG_HA || 0), 1)} ha<br/>
         PVOUT: ${fmtNum(Number(p.pvout || globalPvoutMedian), 0)} kWh/kWp/an`
      )
      .addTo(map);
  });
}

for (const el of Object.values(sliders)) {
  el.addEventListener("input", updateLabels);
  el.addEventListener("change", refreshDebounced);
}
for (const el of [applyPhi, targetHa, mobilizationPct, density, topPct]) {
  el.addEventListener("input", updateLabels);
  el.addEventListener("change", refreshDebounced);
}
document.querySelectorAll("[data-preset]").forEach((b) => {
  b.addEventListener("click", () => applyPreset(b.dataset.preset));
});

init();
