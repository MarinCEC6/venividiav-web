from __future__ import annotations

import json
from pathlib import Path
from urllib.request import urlretrieve

import geopandas as gpd
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent

COMMUNES_PILLARS = Path(r"C:/data/RESULTS_AV/data_processed/communes_pillars.parquet")
COMMUNE_ENERGY = Path(r"C:/data/RESULTS_AV/02_TABLES/merit_continuous/master_elig_pvout_commune.csv")
DEPS_GEOJSON = PROJECT_ROOT / "departements.geojson"

RAW_COMMUNES_GEOJSON = ROOT / "data" / "communes_raw.geojson"
OUT_DEPS = ROOT / "data" / "departements_pillars.geojson"
OUT_COMMUNES = ROOT / "data" / "communes_pillars.geojson"
OUT_COMMUNES_ATTRS = ROOT / "data" / "communes_attrs.json"

RAW_COMMUNES_URL = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes.geojson"


def wavg(s: pd.Series, w: pd.Series) -> float:
    mask = s.notna() & w.notna()
    s = s[mask]
    w = w[mask].clip(lower=0)
    if len(s) == 0:
        return np.nan
    if float(w.sum()) == 0:
        return float(s.mean())
    return float(np.average(s, weights=w))


def ensure_raw_communes() -> None:
    RAW_COMMUNES_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
    if RAW_COMMUNES_GEOJSON.exists():
        return
    print("Downloading raw commune boundaries...")
    urlretrieve(RAW_COMMUNES_URL, RAW_COMMUNES_GEOJSON)


def load_commune_scores() -> pd.DataFrame:
    pillars = pd.read_parquet(COMMUNES_PILLARS).copy()
    pillars["insee"] = pillars["insee"].astype(str).str.zfill(5)
    pillars["dep"] = pillars["dep"].astype(str).str.zfill(2)
    pillars["phi"] = pillars["phi"].astype(float).clip(lower=0, upper=1)

    energy = pd.read_csv(COMMUNE_ENERGY).rename(
        columns={"INSEE5": "insee", "DEP": "dep", "pvout_kwh_kwp_y": "pvout"}
    )
    energy["insee"] = energy["insee"].astype(str).str.zfill(5)
    energy["dep"] = energy["dep"].astype(str).str.zfill(2)

    full = pillars.merge(energy[["insee", "ELIG_HA", "pvout"]], on="insee", how="left")
    full["ELIG_HA"] = pd.to_numeric(full["ELIG_HA"], errors="coerce").fillna(0.0).clip(lower=0)
    full["pvout"] = pd.to_numeric(full["pvout"], errors="coerce")
    return full


def build_commune_geojson(commune_scores: pd.DataFrame) -> None:
    ensure_raw_communes()
    gdf = gpd.read_file(RAW_COMMUNES_GEOJSON)
    gdf["insee"] = gdf["code"].astype(str).str.zfill(5)

    # Keep only communes in the score table
    merged = gdf.merge(commune_scores, on="insee", how="inner")

    # Mild simplification for browser performance
    merged = merged.to_crs(2154)
    merged["geometry"] = merged.geometry.simplify(80, preserve_topology=True)
    merged = merged.to_crs(4326)

    keep = [
        "insee",
        "nom",
        "dep",
        "commune_name",
        "P_E",
        "P_A",
        "P_C",
        "P_R",
        "P_N",
        "phi",
        "ELIG_HA",
        "pvout",
        "geometry",
    ]
    merged = merged[keep]
    merged.to_file(OUT_COMMUNES, driver="GeoJSON")
    print(f"Wrote: {OUT_COMMUNES} ({OUT_COMMUNES.stat().st_size/1e6:.1f} MB)")

    # lightweight attribute table for fast scenario computations in browser
    attrs = merged.drop(columns="geometry").copy()
    attrs = attrs.rename(columns={"nom": "name"})
    attrs.to_json(OUT_COMMUNES_ATTRS, orient="records", force_ascii=False)
    print(f"Wrote: {OUT_COMMUNES_ATTRS} ({OUT_COMMUNES_ATTRS.stat().st_size/1e6:.1f} MB)")


def build_department_geojson(commune_scores: pd.DataFrame) -> None:
    rows = []
    for dep, g in commune_scores.groupby("dep", sort=True):
        row = {
            "dep": dep,
            "n_communes": int(g["insee"].nunique()),
            "phi_mean": float(g["phi"].mean()),
            "ELIG_HA": float(g["ELIG_HA"].sum()),
            "pvout_mean": wavg(g["pvout"], g["ELIG_HA"]),
        }
        for p in ["P_E", "P_A", "P_C", "P_R", "P_N"]:
            row[p] = wavg(g[p], g["phi"])
        row["score_bau_50_50"] = 0.5 * row["P_E"] + 0.5 * row["P_A"]
        row["score_balanced"] = np.nanmean([row["P_E"], row["P_A"], row["P_C"], row["P_R"], row["P_N"]])
        rows.append(row)
    dep_scores = pd.DataFrame(rows).set_index("dep")

    deps = json.loads(DEPS_GEOJSON.read_text(encoding="utf-8"))
    for feat in deps["features"]:
        code = str(feat["properties"]["code"]).zfill(2)
        if code in dep_scores.index:
            vals = dep_scores.loc[code].to_dict()
            for k, v in vals.items():
                feat["properties"][k] = None if pd.isna(v) else float(v) if isinstance(v, (int, float, np.floating)) else v
        else:
            feat["properties"].update(
                {
                    "n_communes": None,
                    "phi_mean": None,
                    "P_E": None,
                    "P_A": None,
                    "P_C": None,
                    "P_R": None,
                    "P_N": None,
                    "ELIG_HA": None,
                    "pvout_mean": None,
                    "score_bau_50_50": None,
                    "score_balanced": None,
                }
            )
    OUT_DEPS.write_text(json.dumps(deps, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote: {OUT_DEPS}")


def main() -> None:
    OUT_COMMUNES.parent.mkdir(parents=True, exist_ok=True)
    scores = load_commune_scores()
    build_department_geojson(scores)
    build_commune_geojson(scores)


if __name__ == "__main__":
    main()
