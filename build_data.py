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
ENERGY_COMPONENTS = next(Path(r"C:/Users/mguinard/Documents").glob("**/E_global_communes_equal_METROPOLE.csv"))
AGRI_COMPONENTS = Path(r"C:/data/Pillar_A_commune.csv")
CLIMATE_COMPONENTS = Path(r"C:/data/C_pillar_commune.csv")
RURAL_COMPONENTS = Path(r"C:/data/R_econ_commune.csv")
NATURE_COMPONENTS = Path(r"C:/data/naturalness_pillar_communes.csv")
DEPS_GEOJSON = PROJECT_ROOT / "departements.geojson"

RAW_COMMUNES_GEOJSON = ROOT / "data" / "communes_raw.geojson"
OUT_DEPS = ROOT / "data" / "departements_pillars.geojson"
OUT_COMMUNES = ROOT / "data" / "communes_pillars.geojson"
OUT_COMMUNES_ATTRS = ROOT / "data" / "communes_attrs.json"
OUT_COMMUNES_SUBATTRS = ROOT / "data" / "communes_subpillars.json"
OUT_QA_UNMATCHED = ROOT / "data" / "qa_unmatched_insee.csv"

RAW_COMMUNES_URL = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes.geojson"

SUBINDICATOR_SPECS = {
    "energy": {
        "path": ENERGY_COMPONENTS,
        "id_col": "INSEE_COM",
        "cols": ["E1_score", "E2_score", "E3_score", "E_mean"],
        "required": ["E1_score", "E2_score", "E3_score"],
        "fallback": "P_E",
    },
    "agri": {
        "path": AGRI_COMPONENTS,
        "id_col": "INSEE5",
        "cols": ["A1_score", "A2_score", "A3_score", "A_score"],
        "required": ["A1_score", "A2_score", "A3_score"],
        "fallback": "P_A",
    },
    "climate": {
        "path": CLIMATE_COMPONENTS,
        "id_col": "INSEE5",
        "cols": ["c1", "c2", "c3", "C_score"],
        "required": ["c1", "c2", "c3"],
        "fallback": "P_C",
    },
    "rural": {
        "path": RURAL_COMPONENTS,
        "id_col": "INSEE5",
        "cols": ["R1_TF_score", "R2_SAU_score", "R3_PBS_score", "R_econ_score"],
        "required": ["R1_TF_score", "R2_SAU_score", "R3_PBS_score"],
        "fallback": "P_R",
    },
    "nature": {
        "path": NATURE_COMPONENTS,
        "id_col": "INSEE5",
        "cols": ["N1_hedges_mm", "N2_pp_mm", "N3_forest_mm", "P_N_pos"],
        "required": ["N1_hedges_mm", "N2_pp_mm", "N3_forest_mm"],
        "fallback": "P_N",
    },
}


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


def load_component_table(name: str, spec: dict) -> pd.DataFrame:
    path = spec["path"]
    if not path.exists():
        raise FileNotFoundError(f"Missing {name}-component table: {path}")

    df = pd.read_csv(path, dtype={spec["id_col"]: str}).copy()
    required = {spec["id_col"], *spec["cols"]}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Missing columns in {path.name}: {missing}")

    df["insee"] = df[spec["id_col"]].astype(str).str.strip().str.upper().str.zfill(5)
    keep = ["insee", *spec["cols"]]
    df = df[keep].copy()
    for c in spec["cols"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    if df["insee"].duplicated().any():
        df = df.sort_values(["insee"]).drop_duplicates("insee", keep="first")

    return df


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

    if df["insee"].duplicated().any():
        df = df.sort_values(["insee"]).drop_duplicates("insee", keep="first")

    for name, spec in SUBINDICATOR_SPECS.items():
        comp = load_component_table(name, spec)
        df = df.merge(comp, on="insee", how="left", validate="one_to_one")
        fallback = spec.get("fallback")
        if fallback:
            for col in spec["required"]:
                df[col] = df[col].fillna(df[fallback])
        bad = df[spec["required"]].isna().any(axis=1)
        if bad.any():
            sample = df.loc[bad, ["insee", "dep"]].head(10).to_dict(orient="records")
            raise ValueError(
                f"Found {int(bad.sum())} rows with missing {name} sub-indicators after merge. "
                f"Sample: {sample}"
            )

    return df


def build_commune_geojson(commune_scores: pd.DataFrame) -> None:
    ensure_raw_communes()
    gdf = gpd.read_file(RAW_COMMUNES_GEOJSON)
    gdf["insee"] = gdf["code"].astype(str).str.strip().str.upper().str.zfill(5)

    merged = gdf.merge(commune_scores, on="insee", how="inner")

    all_codes = set(commune_scores["insee"])
    kept_codes = set(merged["insee"])
    lost_codes = sorted(all_codes - kept_codes)
    pd.DataFrame({"insee": lost_codes}).to_csv(OUT_QA_UNMATCHED, index=False)
    print(f"Wrote: {OUT_QA_UNMATCHED} (unmatched INSEE: {len(lost_codes)})")

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
        "A1_score",
        "A2_score",
        "A3_score",
        "P_C",
        "c1",
        "c2",
        "c3",
        "P_R",
        "R1_TF_score",
        "R2_SAU_score",
        "R3_PBS_score",
        "P_N",
        "N1_hedges_mm",
        "N2_pp_mm",
        "N3_forest_mm",
        "phi",
        "ELIG_HA",
        "pvout",
        "geometry",
    ]
    merged = merged[keep]
    merged.to_file(OUT_COMMUNES, driver="GeoJSON")
    print(f"Wrote: {OUT_COMMUNES} ({OUT_COMMUNES.stat().st_size/1e6:.1f} MB)")

    attrs = merged.drop(columns="geometry").copy().rename(columns={"nom": "name"})

    sub_cols = [
        "E1_score", "E2_score", "E3_score",
        "A1_score", "A2_score", "A3_score",
        "c1", "c2", "c3",
        "R1_TF_score", "R2_SAU_score", "R3_PBS_score",
        "N1_hedges_mm", "N2_pp_mm", "N3_forest_mm",
    ]
    base_cols = [c for c in attrs.columns if c not in sub_cols]

    attrs[base_cols].to_json(OUT_COMMUNES_ATTRS, orient="records", force_ascii=False)
    print(f"Wrote: {OUT_COMMUNES_ATTRS} ({OUT_COMMUNES_ATTRS.stat().st_size/1e6:.1f} MB)")

    attrs[["insee", *sub_cols]].to_json(OUT_COMMUNES_SUBATTRS, orient="records", force_ascii=False)
    print(f"Wrote: {OUT_COMMUNES_SUBATTRS} ({OUT_COMMUNES_SUBATTRS.stat().st_size/1e6:.1f} MB)")


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
