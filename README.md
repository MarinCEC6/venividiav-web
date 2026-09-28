# VeniVidiAV Web Explorer — PMTiles + MapLibre

This web app serves a commune-level agrivoltaics explorer with in-browser scenario computation and a dark, high-contrast cartographic interface.

## 1) Build the data

From `webapp/`:

```bash
python build_data.py
```

Outputs:
- `data/communes_pillars.geojson`
- `data/communes_attrs.json`
- `data/departements_pillars.geojson`

## 2) Build PMTiles

```bash
python build_pmtiles.py
```

Outputs:
- `data/communes.mbtiles`
- `data/communes.pmtiles`

## 3) Run locally

```bash
cd C:\data\RESULTS_AV\03_FIGURES\policy_scenarios_custom_v2\webapp
python serve_range.py
```

Then open:

`http://localhost:8000`

PMTiles requires HTTP `Range` requests. For local testing, prefer `serve_range.py` rather than a minimal static server.

## 4) Deployment note

GitHub Pages deployment is handled by `.github/workflows/pages.yml`.
The workflow stamps a build version into `index.html` and `app.js` at deploy time so CSS, JavaScript, and data requests use cache-busting query strings. This is meant to reduce the risk of an older cached version being served after an update.

## 5) Scientific interpretation of the app

The explorer is a spatial targeting tool for five municipal pillars:
- Energy = prospective cost-efficiency of electricity production using the final fixed-K50 LCOE-based score `P_E = P_E_fixedK50`;
- Agricultural intensity = targeting potential under a transition rationale;
- Climate resilience = targeting potential under water/heat/frost stress conditions;
- Rural resilience = targeting potential under long-run agricultural fragility;
- Nature conservation = targeting potential under a conservation rationale.

High scores indicate stronger priority under the relevant objective. They do not imply a realized benefit or a guaranteed causal effect of agrivoltaics at a given municipality.

The tool also exposes:
- dynamic pillar reweighting across the five dimensions;
- optional application of `phi` feasibility;
- deployment target, mobilization, and PV density parameters;
- annual output KPIs;
- a live top-communes table;
- interactive commune popups on the map.
