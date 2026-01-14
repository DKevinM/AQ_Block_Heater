import os
from io import StringIO
from pathlib import Path

import requests
import geopandas as gpd
import pandas as pd
import numpy as np
from shapely.geometry import Point, Polygon

# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------
STATIONS_URL = "https://raw.github.com/DKevinM/AB_datapull/main/data/last6h.csv"
PURPLE_URL   = "https://raw.githubusercontent.com/DKevinM/AB_datapull/main/data/AB_PM25_map.json"

STATION_WEIGHT = 1.0
PURPLE_WEIGHT  = 0.5
MAX_DIST_KM    = 100.0    # influence radius for IDW / confidence
MIN_POINTS     = 1       # minimum contributing monitors to accept a value


# ---------------------------------------------------------
# AQHI color helper
# ---------------------------------------------------------
def get_aqhi_color(val_rounded):
    """
    Map AQHI value or '10+' string to hex color.
    """
    try:
        if isinstance(val_rounded, str) and val_rounded.strip() == "10+":
            return "#640100"
        v = int(round(float(val_rounded)))
        if v < 1:
            return "#D3D3D3"
        elif v == 1:
            return "#01cbff"
        elif v == 2:
            return "#0099cb"
        elif v == 3:
            return "#016797"
        elif v == 4:
            return "#fffe03"
        elif v == 5:
            return "#ffcb00"
        elif v == 6:
            return "#ff9835"
        elif v == 7:
            return "#fd6866"
        elif v == 8:
            return "#fe0002"
        elif v == 9:
            return "#cc0001"
        elif v == 10:
            return "#9a0100"
        else:
            return "#640100"  # >10
    except Exception:
        return "#D3D3D3"


# ---------------------------------------------------------
# Load station CSV (last6h.csv)
# ---------------------------------------------------------
resp = requests.get(STATIONS_URL)
resp.raise_for_status()
df = pd.read_csv(StringIO(resp.text))

# Blank / NA ParameterName => AQHI
df["ParameterName"] = df["ParameterName"].apply(
    lambda x: "AQHI" if pd.isna(x) or str(x).strip() == "" else x
)

df["ReadingDate"] = pd.to_datetime(df["ReadingDate"], errors="coerce")
df["Value"] = pd.to_numeric(df["Value"], errors="coerce")

df = df.dropna(subset=["Value", "Latitude", "Longitude"])
print(df["ReadingDate"].head())
print("Station tz info:", df["ReadingDate"].dt.tz)


# ---------------------------------------------------------
# PurpleAir loader (pm_corr -> eAQHI)
# ---------------------------------------------------------
def load_purpleair():
    """
    Load PurpleAir sensors from AB_PM25_map.json.
    Expected fields: lat, lon (or Latitude/Longitude), pm_corr.
    Returns DataFrame with columns: lat, lon, eAQHI
    """
    resp = requests.get(PURPLE_URL)
    resp.raise_for_status()
    data = resp.json()

    # Try to get to a list of records
    if isinstance(data, dict) and "data" in data:
        records = data["data"]
    elif isinstance(data, list):
        records = data
    else:
        raise ValueError("Unexpected JSON structure in AB_PM25_map.json")

    df_pa = pd.DataFrame(records)

    # Latitude / longitude candidates
    lat_candidates = ["lat", "Lat", "latitude", "Latitude", "LAT"]
    lon_candidates = ["lon", "Lon", "lng", "Lng", "longitude", "Longitude", "LON"]

    lat_col = next((c for c in lat_candidates if c in df_pa.columns), None)
    lon_col = next((c for c in lon_candidates if c in df_pa.columns), None)
    if lat_col is None or lon_col is None:
        raise ValueError("Could not find lat/lon columns in AB_PM25_map.json")

    if "pm_corr" not in df_pa.columns:
        raise ValueError("pm_corr column not found in AB_PM25_map.json")

    df_pa["lat"] = pd.to_numeric(df_pa[lat_col], errors="coerce")
    df_pa["lon"] = pd.to_numeric(df_pa[lon_col], errors="coerce")
    df_pa["pm_corr"] = pd.to_numeric(df_pa["pm_corr"], errors="coerce")

    df_pa = df_pa.dropna(subset=["lat", "lon", "pm_corr"]).copy()

    # Estimated AQHI = floor(pm_corr / 10) + 1, capped 0–10
    e = np.floor(df_pa["pm_corr"] / 10.0) + 1
    e = e.clip(lower=0, upper=10)
    df_pa["eAQHI"] = e

    return df_pa[["lat", "lon", "eAQHI"]].copy()


purple_df = load_purpleair()
print(f"Loaded {len(purple_df)} PurpleAir sensors with eAQHI")


# ---------------------------------------------------------
# IDW with confidence
# ---------------------------------------------------------
def idw_with_conf(xy, values, weights, grid_xy, power=2, max_dist_km=None, min_points=1):
    """
    Inverse distance weighting with source weights and simple confidence metrics.

    xy          : (N, 2) array of [lon, lat] for monitors
    values      : (N,) AQHI or eAQHI
    weights     : (N,) source weights (stations=1.0, PurpleAir=0.5)
    grid_xy     : (M, 2) array of [lon, lat] for grid cell centers
    power       : IDW power
    max_dist_km : optional maximum distance for contributions
    min_points  : minimum number of monitors contributing

    Returns:
      grid_values  : (M,) interpolated AQHI
      nearest_km   : (M,) distance to nearest contributing monitor (km)
      n_points     : (M,) number of contributing monitors
      weight_sum   : (M,) sum of IDW weights used at each cell
    """
    xy = np.asarray(xy, dtype=float)
    values = np.asarray(values, dtype=float)
    weights = np.asarray(weights, dtype=float)
    grid_xy = np.asarray(grid_xy, dtype=float)

    if xy.shape[0] == 0:
        m = grid_xy.shape[0]
        nan_arr = np.full(m, np.nan)
        return nan_arr, nan_arr, np.zeros(m, dtype=int), nan_arr

    gx = grid_xy[:, 0][:, None]  # (M,1)
    gy = grid_xy[:, 1][:, None]
    px = xy[:, 0][None, :]       # (1,N)
    py = xy[:, 1][None, :]

    dx_deg = gx - px
    dy_deg = gy - py
    dist_deg = np.sqrt(dx_deg**2 + dy_deg**2)
    dist_km = dist_deg * 111.0  # approximate conversion

    dist_km[dist_km == 0] = 1e-6

    if max_dist_km is not None:
        valid = dist_km <= max_dist_km
    else:
        valid = np.ones_like(dist_km, dtype=bool)

    w_idw = np.where(valid, weights[None, :] / (dist_km**power), 0.0)

    n_points = valid.sum(axis=1)

    num = (w_idw * values[None, :]).sum(axis=1)
    den = w_idw.sum(axis=1)

    bad = (n_points < min_points) | (den == 0)
    grid_values = num / den
    grid_values[bad] = np.nan

    dist_km_masked = np.where(valid, dist_km, np.inf)
    nearest_km = dist_km_masked.min(axis=1)
    nearest_km[np.isinf(nearest_km)] = np.nan

    return grid_values, nearest_km, n_points, den


# ---------------------------------------------------------
# Station-only grid
# ---------------------------------------------------------
def generate_current_grid(df, shapefile_path, output_dir="output", cellsize=0.005):
    aqhi_only = df[df["ParameterName"] == "AQHI"].copy()
    floored_hours = aqhi_only["ReadingDate"].dt.floor("h")
    latest_hour = floored_hours.max()
    aqhi_hourly = aqhi_only[floored_hours == latest_hour]

    latest_aqhi = (
        aqhi_hourly.sort_values("ReadingDate")
        .groupby("StationName")
        .tail(1)
        .dropna(subset=["Value", "Latitude", "Longitude"])
    )

    print(f"Generating STATION grid for {os.path.basename(shapefile_path)} "
          f"from {len(latest_aqhi)} stations")

    shapefile_name = os.path.basename(shapefile_path).lower()

    if "aca" in shapefile_name:
        cellsize = 0.05
    elif "wcas" in shapefile_name:
        cellsize = 0.05
    elif "alberta" in shapefile_name:
        cellsize = 0.1
    else:
        cellsize = 0.005

    region = gpd.read_file(shapefile_path).to_crs("EPSG:4326")
    xmin, ymin, xmax, ymax = region.total_bounds

    x = np.arange(xmin, xmax, cellsize)
    y = np.arange(ymin, ymax, cellsize)
    xx, yy = np.meshgrid(x, y)
    grid_points = np.c_[xx.ravel(), yy.ravel()]

    point_geom = gpd.GeoSeries([Point(xy) for xy in grid_points], crs="EPSG:4326")
    inside_mask = point_geom.within(region.union_all())
    grid_inside = grid_points[inside_mask.values]

    # Station-only point set
    xy_stn = latest_aqhi[["Longitude", "Latitude"]].to_numpy(dtype=float)
    val_stn = latest_aqhi["Value"].to_numpy(dtype=float)
    w_stn   = np.full(len(xy_stn), STATION_WEIGHT, dtype=float)

    grid_values, nearest_km, n_points, weight_sum = idw_with_conf(
        xy_stn,
        val_stn,
        w_stn,
        grid_inside,
        power=2,
        max_dist_km=MAX_DIST_KM,
        min_points=MIN_POINTS
    )

    polygons, aqhi_vals, colors, labels = [], [], [], []
    nearest_list, npoints_list, wsum_list, conf_list = [], [], [], []

    ts_str = latest_aqhi["ReadingDate"].max().strftime("%Y-%m-%d %H:%M:%S")

    for i, (x0, y0) in enumerate(grid_inside):
        poly = Polygon([
            (x0, y0),
            (x0 + cellsize, y0),
            (x0 + cellsize, y0 + cellsize),
            (x0, y0 + cellsize)
        ])

        val = grid_values[i]
        nk  = nearest_km[i]
        npnt = int(n_points[i])
        wsum = float(weight_sum[i])

        if np.isnan(val):
            val_display = "NA"
            label = "No Data"
            color = "#D3D3D3"
            conf  = "None"
        else:
            rounded_val = int(round(val))
            val_capped = min(rounded_val, 11)
            val_display = "10+" if val_capped == 11 else str(val_capped)
            label = f"AQHI {val_display}"
            color = get_aqhi_color(val_display)

            if npnt >= 5 and (nk is not None) and nk <= 15:
                conf = "High"
            elif npnt >= 3 and (nk is not None) and nk <= 30:
                conf = "Medium"
            elif npnt >= 1 and (nk is not None) and nk <= 50:
                conf = "Low"
            else:
                conf = "None"

        polygons.append(poly)
        aqhi_vals.append(val_display)
        colors.append(color)
        labels.append(label)
        nearest_list.append(nk)
        npoints_list.append(npnt)
        wsum_list.append(wsum)
        conf_list.append(conf)

    gdf_out = gpd.GeoDataFrame({
        "value": aqhi_vals,
        "label": labels,
        "color": colors,
        "timestamp": ts_str,
        "nearest_km": nearest_list,
        "n_points": npoints_list,
        "weight_sum": wsum_list,
        "confidence": conf_list,
        "geometry": polygons
    }, crs="EPSG:4326")

    base = os.path.basename(shapefile_path).replace(".shp", "")
    out_path = os.path.join(output_dir, f"AQHI_{base}.geojson")
    os.makedirs(output_dir, exist_ok=True)
    gdf_out.to_file(out_path, driver="GeoJSON")
    print(f"Saved station grid: {out_path}")


# ---------------------------------------------------------
# Blended grid (stations + PurpleAir)
# ---------------------------------------------------------
def generate_blended_grid(df, purple_df, shapefile_path, output_dir="output", cellsize=0.005):
    """
    Build a blended AQHI grid for a given region:
      - station AQHI (from last6h.csv, ParameterName == 'AQHI')
      - PurpleAir eAQHI (from purple_df), with weight 0.5
    Output: AQHI_<shapefile_name>_blend.geojson
    """
    aqhi_only = df[df["ParameterName"] == "AQHI"].copy()
    floored_hours = aqhi_only["ReadingDate"].dt.floor("h")
    latest_hour = floored_hours.max()
    aqhi_hourly = aqhi_only[floored_hours == latest_hour]

    latest_aqhi = (
        aqhi_hourly.sort_values("ReadingDate")
        .groupby("StationName")
        .tail(1)
        .dropna(subset=["Value", "Latitude", "Longitude"])
    )

    region = gpd.read_file(shapefile_path).to_crs("EPSG:4326")
    xmin, ymin, xmax, ymax = region.total_bounds

    # Subset PurpleAir to a bbox around the region
    margin = 0.2
    pa_sub = purple_df[
        (purple_df["lat"].between(ymin - margin, ymax + margin)) &
        (purple_df["lon"].between(xmin - margin, xmax + margin))
    ].copy()

    print(f"Generating BLENDED grid for {os.path.basename(shapefile_path)} "
          f"from {len(latest_aqhi)} stations + {len(pa_sub)} PurpleAir sensors")

    shapefile_name = os.path.basename(shapefile_path).lower()

    if "aca" in shapefile_name:
        cellsize = 0.05
    elif "wcas" in shapefile_name:
        cellsize = 0.05
    elif "alberta" in shapefile_name:
        cellsize = 0.1
    else:
        cellsize = 0.005

    x = np.arange(xmin, xmax, cellsize)
    y = np.arange(ymin, ymax, cellsize)
    xx, yy = np.meshgrid(x, y)
    grid_points = np.c_[xx.ravel(), yy.ravel()]

    point_geom = gpd.GeoSeries([Point(xy) for xy in grid_points], crs="EPSG:4326")
    inside_mask = point_geom.within(region.union_all())
    grid_inside = grid_points[inside_mask.values]

    # Combined station + PurpleAir set
    xy_stn = latest_aqhi[["Longitude", "Latitude"]].to_numpy(dtype=float)
    val_stn = latest_aqhi["Value"].to_numpy(dtype=float)
    w_stn   = np.full(len(xy_stn), STATION_WEIGHT, dtype=float)

    xy_pa = pa_sub[["lon", "lat"]].to_numpy(dtype=float)
    val_pa = pa_sub["eAQHI"].to_numpy(dtype=float)
    w_pa   = np.full(len(xy_pa), PURPLE_WEIGHT, dtype=float)

    if len(xy_pa) > 0:
        xy_all = np.vstack([xy_stn, xy_pa])
        val_all = np.concatenate([val_stn, val_pa])
        w_all = np.concatenate([w_stn, w_pa])
    else:
        xy_all = xy_stn
        val_all = val_stn
        w_all = w_stn

    grid_values, nearest_km, n_points, weight_sum = idw_with_conf(
        xy_all,
        val_all,
        w_all,
        grid_inside,
        power=2,
        max_dist_km=MAX_DIST_KM,
        min_points=MIN_POINTS
    )

    polygons, aqhi_vals, colors, labels = [], [], [], []
    nearest_list, npoints_list, wsum_list, conf_list = [], [], [], []

    ts_str = latest_aqhi["ReadingDate"].max().strftime("%Y-%m-%d %H:%M:%S")

    for i, (x0, y0) in enumerate(grid_inside):
        poly = Polygon([
            (x0, y0),
            (x0 + cellsize, y0),
            (x0 + cellsize, y0 + cellsize),
            (x0, y0 + cellsize)
        ])

        val = grid_values[i]
        nk  = nearest_km[i]
        npnt = int(n_points[i])
        wsum = float(weight_sum[i])

        if np.isnan(val):
            val_display = "NA"
            label = "No Data"
            color = "#D3D3D3"
            conf  = "None"
        else:
            rounded_val = int(round(val))
            val_capped = min(rounded_val, 11)
            val_display = "10+" if val_capped == 11 else str(val_capped)
            label = f"AQHI {val_display}"
            color = get_aqhi_color(val_display)

            if npnt >= 5 and (nk is not None) and nk <= 15:
                conf = "High"
            elif npnt >= 3 and (nk is not None) and nk <= 30:
                conf = "Medium"
            elif npnt >= 1 and (nk is not None) and nk <= 50:
                conf = "Low"
            else:
                conf = "None"

        polygons.append(poly)
        aqhi_vals.append(val_display)
        colors.append(color)
        labels.append(label)
        nearest_list.append(nk)
        npoints_list.append(npnt)
        wsum_list.append(wsum)
        conf_list.append(conf)

    gdf_out = gpd.GeoDataFrame({
        "value": aqhi_vals,
        "label": labels,
        "color": colors,
        "timestamp": ts_str,
        "nearest_km": nearest_list,
        "n_points": npoints_list,
        "weight_sum": wsum_list,
        "confidence": conf_list,
        "geometry": polygons
    }, crs="EPSG:4326")

    base = os.path.basename(shapefile_path).replace(".shp", "")
    out_path = os.path.join(output_dir, f"AQHI_{base}_blend.geojson")
    os.makedirs(output_dir, exist_ok=True)
    gdf_out.to_file(out_path, driver="GeoJSON")
    print(f"Saved blended grid: {out_path}")



# ---------------------------------------------------------
# MAIN LOOP
# ---------------------------------------------------------
if __name__ == "__main__":
    shapefiles = list(Path("data").glob("*.shp"))

    for shp in shapefiles:
        shapefile_name = shp.stem  # e.g. "Edm", "Strathcona", "ACA_Boundary_2022"
        print(f"\nProcessing (station grid): {shapefile_name}")

        # 1) Station-only grid
        try:
            generate_current_grid(
                df,
                shapefile_path=str(shp),
                output_dir="output"
            )
        except Exception as e:
            print(f"Error processing station grid for {shapefile_name}: {e}")

        # 2) Blended grid (stations + PurpleAir) for ALL shapefiles
        print(f"Processing BLENDED grid for {shapefile_name}")
        try:
            generate_blended_grid(
                df,
                purple_df=purple_df,
                shapefile_path=str(shp),
                output_dir="output"
            )
        except Exception as e:
            print(f"Error processing blended grid for {shapefile_name}: {e}")
