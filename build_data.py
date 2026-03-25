from __future__ import annotations

import json
from pathlib import Path
from urllib.request import urlretrieve

import geopandas as gpd
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent

MASTER_SCENARIOS = Path(r"C:/data/RESULTS_AV/02_TABLES/policy_scenarios_custom_full/MASTER_used_for_custom_scenarios_full.csv")
ENERGY_COMPONENTS = Path(r"C:/Users/mguinard/Documents/Thèse 1A/Cartographie R/E_global_communes_equal_METROPOLE.csv")
DEPS_GEOJSON = PROJECT_ROOT / "departements.geojson"

RAW_COMMUNES_GEOJSON = ROOT / "data" / "communes_raw.geojson"
OUT_DEPS = ROOT / "data" / "departements_pillars.geojson"
OUT_COMMUNES = ROOT / "data" / "communes_pillars.geojson"
OUT_COMMUNES_ATTRS = ROOT / "data" / "communes_attrs.json"
OUT_QA_UNMATCHED = ROOT / "data" / "qa_unmatched_insee.csv"

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


def normalize_dep(dep: pd.Series) -> pd.Series:
    dep = dep.astype(str).str.strip().str.upper()
    is_numeric = dep.str.fullmatch(r"\d+")
    dep.loc[is_numeric] = dep.loc[is_numeric].str.zfill(2)
    return dep


def load_commune_scores() -> pd.DataFrame:
    if not MASTER_SCENARIOS.exists():
        raise FileNotFoundError(f"Missing source table: {MASTER_SCENARIOS}")

    df = pd.read_csv(MASTER_SCENARIOS, dtype={"INSEE5": str, "DEP": str}).copy()
    required = {"INSEE5", "DEP", "ELIG_HA", "pvout_kwh_kwp_y", "P_E", "P_A", "P_C", "P_R", "P_N", "phi"}
    missing_cols = sorted(required - set(df.columns))
    if missing_cols:
        raise ValueError(f"Missing columns in {MASTER_SCENARIOS.name}: {missing_cols}")

    df["insee"] = df["INSEE5"].astype(str).str.strip().str.upper().str.zfill(5)
    df["dep"] = normalize_dep(df["DEP"])
    df = df.rename(columns={"pvout_kwh_kwp_y": "pvout"})

    keep = ["insee", "dep", "P_E", "P_A", "P_C", "P_R", "P_N", "phi", "ELIG_HA", "pvout"]
    df = df[keep].copy()

    for c in ["P_E", "P_A", "P_C", "P_R", "P_N", "ELIG_HA", "pvout"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["phi"] = pd.to_numeric(df["phi"], errors="coerce").fillna(0.0).clip(lower=0, upper=1)

    bad_required = df[["P_E", "P_A", "P_C", "P_R", "P_N", "ELIG_HA", "pvout"]].isna().any(axis=1)
    if bad_required.any():
        sample = df.loc[bad_required, ["insee", "dep"]].head(10).to_dict(orient="records")
        raise ValueError(
            f"Found {int(bad_required.sum())} rows with missing required values in MASTER table. "
            f"Sample: {sample}"
        )

    # Keep one row per commune if duplicates exist
    if df["insee"].duplicated().any():
        df = df.sort_values(["insee"]).drop_duplicates("insee", keep="first")

    if not ENERGY_COMPONENTS.exists():
        raise FileNotFoundError(f"Missing energy-component table: {ENERGY_COMPONENTS}")

    energy = pd.read_csv(ENERGY_COMPONENTS, dtype={"INSEE_COM": str}).copy()
    required_energy = {"INSEE_COM", "E1_score", "E2_score", "E3_score", "E_mean"}
    missing_energy = sorted(required_energy - set(energy.columns))
    if missing_energy:
        raise ValueError(f"Missing columns in {ENERGY_COMPONENTS.name}: {missing_energy}")

    energy["insee"] = energy["INSEE_COM"].astype(str).str.strip().str.upper().str.zfill(5)
    keep_energy = ["insee", "E1_score", "E2_score", "E3_score", "E_mean"]
    energy = energy[keep_energy].copy()
    for c in ["E1_score", "E2_score", "E3_score", "E_mean"]:
        energy[c] = pd.to_numeric(energy[c], errors="coerce")

    df = df.merge(energy, on="insee", how="left", validate="one_to_one")

    bad_energy = df[["E1_score", "E2_score", "E3_score"]].isna().any(axis=1)
    if bad_energy.any():
        sample = df.loc[bad_energy, ["insee", "dep"]].head(10).to_dict(orient="records")
        raise ValueError(
            f"Found {int(bad_energy.sum())} rows with missing energy sub-indicators after merge. "
            f"Sample: {sample}"
        )

    return df


def build_commune_geojson(commune_scores: pd.DataFrame) -> None:
    ensure_raw_communes()
    gdf = gpd.read_file(RAW_COMMUNES_GEOJSON)
    gdf["insee"] = gdf["code"].astype(str).str.strip().str.upper().str.zfill(5)

    # Keep only communes in the score table
    merged = gdf.merge(commune_scores, on="insee", how="inner")

    all_codes = set(commune_scores["insee"])
    kept_codes = set(merged["insee"])
    lost_codes = sorted(all_codes - kept_codes)
    pd.DataFrame({"insee": lost_codes}).to_csv(OUT_QA_UNMATCHED, index=False)
    print(f"Wrote: {OUT_QA_UNMATCHED} (unmatched INSEE: {len(lost_codes)})")

    # Mild simplification for browser performance
    merged = merged.to_crs(2154)
    merged["geometry"] = merged.geometry.simplify(80, preserve_topology=True)
    merged = merged.to_crs(4326)

    merged["commune_name"] = merged["nom"]

    keep = [
        "insee",
        "nom",
        "dep",
        "commune_name",
        "P_E",
        "E1_score",
        "E2_score",
        "E3_score",
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
