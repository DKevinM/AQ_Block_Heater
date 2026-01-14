import os
from io import StringIO
from pathlib import Path

import requests
import geopandas as gpd
import pandas as pd
import numpy as np


# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------
STATIONS_URL = "https://raw.github.com/DKevinM/AB_datapull/main/data/last6h.csv"
PURPLE_URL   = "https://raw.githubusercontent.com/DKevinM/AB_datapull/main/data/AB_PM25_map.json"

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


            print(f"Error processing blended grid for {shapefile_name}: {e}")
