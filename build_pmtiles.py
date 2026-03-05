from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import geopandas as gpd
import mercantile
from mapbox_vector_tile import encode as mvt_encode
from pmtiles.convert import mbtiles_to_pmtiles
from shapely.geometry import box, mapping
from shapely.ops import transform


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "data" / "communes_pillars.geojson"
OUT_MBTILES = ROOT / "data" / "communes.mbtiles"
OUT_PMTILES = ROOT / "data" / "communes.pmtiles"

LAYER_NAME = "communes"
EXTENT = 4096
ZMIN = 0
ZMAX = 11


def clean_geom(g):
    if g.is_empty:
        return None
    t = g.geom_type
    if t in ("Polygon", "MultiPolygon"):
        return g
    if t == "GeometryCollection":
        polys = [x for x in g.geoms if x.geom_type in ("Polygon", "MultiPolygon")]
        if not polys:
            return None
        out = polys[0]
        for p in polys[1:]:
            out = out.union(p)
        return out
    return None


def geom_to_tile_space(geom, left, bottom, right, top):
    sx = EXTENT / (right - left)
    sy = EXTENT / (top - bottom)

    def f(x, y, z=None):
        tx = (x - left) * sx
        ty = (top - y) * sy
        return (tx, ty)

    return transform(f, geom)


def init_mbtiles(path: Path) -> sqlite3.Connection:
    if path.exists():
        path.unlink()
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("CREATE TABLE metadata (name TEXT, value TEXT)")
    cur.execute("CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB)")
    cur.execute("CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row)")
    con.commit()
    return con


def main():
    if not SRC.exists():
        raise FileNotFoundError(f"Missing source GeoJSON: {SRC}. Run build_data.py first.")

    gdf = gpd.read_file(SRC).to_crs(3857)
    gdf = gdf[~gdf.geometry.is_empty].copy()
    sidx = gdf.sindex
    bbox_wgs = gdf.to_crs(4326).total_bounds  # west,south,east,north

    con = init_mbtiles(OUT_MBTILES)
    cur = con.cursor()

    count_tiles = 0
    count_features = 0

    for z in range(ZMIN, ZMAX + 1):
        tiles = list(mercantile.tiles(bbox_wgs[0], bbox_wgs[1], bbox_wgs[2], bbox_wgs[3], [z]))
        for t in tiles:
            b = mercantile.xy_bounds(t.x, t.y, t.z)
            tile_poly = box(b.left, b.bottom, b.right, b.top)
            idx = list(sidx.intersection((b.left, b.bottom, b.right, b.top)))
            if not idx:
                continue
            cand = gdf.iloc[idx]

            features = []
            for _, r in cand.iterrows():
                g = r.geometry
                if not g.intersects(tile_poly):
                    continue
                cg = clean_geom(g.intersection(tile_poly))
                if cg is None:
                    continue
                tg = geom_to_tile_space(cg, b.left, b.bottom, b.right, b.top)
                if tg.is_empty:
                    continue
                props = {
                    "insee": str(r.get("insee", "")),
                    "name": r.get("nom") if r.get("nom") is not None else r.get("commune_name", ""),
                    "dep": str(r.get("dep", "")),
                    "P_E": float(r.get("P_E", 0.0) or 0.0),
                    "P_A": float(r.get("P_A", 0.0) or 0.0),
                    "P_C": float(r.get("P_C", 0.0) or 0.0),
                    "P_R": float(r.get("P_R", 0.0) or 0.0),
                    "P_N": float(r.get("P_N", 0.0) or 0.0),
                    "phi": float(r.get("phi", 0.0) or 0.0),
                    "ELIG_HA": float(r.get("ELIG_HA", 0.0) or 0.0),
                    "pvout": float(r.get("pvout", 0.0) or 0.0),
                }
                features.append({"geometry": mapping(tg), "properties": props})

            if not features:
                continue

            # Coordinates are already transformed to tile space with y-down orientation,
            # so we disable encoder-side y flipping.
            tile_data = mvt_encode(
                [{"name": LAYER_NAME, "features": features}],
                default_options={"extents": EXTENT, "y_coord_down": True},
            )
            tile_row = (2**z - 1 - t.y)  # TMS
            cur.execute(
                "INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)",
                (z, t.x, tile_row, sqlite3.Binary(tile_data)),
            )
            count_tiles += 1
            count_features += len(features)

        con.commit()
        print(f"z{z}: done, cumulative tiles={count_tiles}")

    metadata = {
        "name": "VeniVidiAV communes",
        "type": "overlay",
        "version": "1",
        "description": "Commune layer with AV pillar attributes",
        "format": "pbf",
        "minzoom": str(ZMIN),
        "maxzoom": str(ZMAX),
        "bounds": ",".join(map(str, bbox_wgs)),
        "center": f"{(bbox_wgs[0]+bbox_wgs[2])/2},{(bbox_wgs[1]+bbox_wgs[3])/2},6",
        "json": json.dumps(
            {
                "vector_layers": [
                    {
                        "id": LAYER_NAME,
                        "fields": {
                            "insee": "String",
                            "name": "String",
                            "dep": "String",
                            "P_E": "Number",
                            "P_A": "Number",
                            "P_C": "Number",
                            "P_R": "Number",
                            "P_N": "Number",
                            "phi": "Number",
                            "ELIG_HA": "Number",
                            "pvout": "Number",
                        },
                    }
                ]
            }
        ),
    }
    cur.executemany("INSERT INTO metadata(name, value) VALUES (?, ?)", metadata.items())
    con.commit()
    con.close()

    print(f"Wrote MBTiles: {OUT_MBTILES} ({OUT_MBTILES.stat().st_size/1e6:.1f} MB)")
    mbtiles_to_pmtiles(str(OUT_MBTILES), str(OUT_PMTILES), ZMAX)
    print(f"Wrote PMTiles: {OUT_PMTILES} ({OUT_PMTILES.stat().st_size/1e6:.1f} MB)")
    print(f"Tiles: {count_tiles}, encoded features (tile-local): {count_features}")


if __name__ == "__main__":
    main()
