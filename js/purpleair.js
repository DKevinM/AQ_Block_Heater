// ---------- PURPLEAIR LOADER ----------
window.purpleAirSensors = [];
window.purpleAirMarkers = [];


function getPM25Color(pm25) {
  if (!pm25 || isNaN(pm25)) return "#808080";
  if (pm25 > 100) return "#640100";
  if (pm25 > 90)  return "#9a0100";
  if (pm25 > 80)  return "#cc0001";
  if (pm25 > 70)  return "#fe0002";
  if (pm25 > 60)  return "#fd6866";
  if (pm25 > 50)  return "#ff9835";
  if (pm25 > 40)  return "#ffcb00";
  if (pm25 > 30)  return "#fffe03";
  if (pm25 > 20)  return "#016797";
  return "#01cbff";
}


window.paLayer = window.paLayer || L.layerGroup();


const PURPLE_URL =
  "https://raw.githubusercontent.com/DKevinM/AB_datapull/main/data/AB_PM25_map.json";

// eAQHI = floor(pm_corr / 10) + 1, capped 0–10
function computeEAQHI(pm) {
  if (pm == null || isNaN(pm)) return null;
  let val = Math.floor(pm / 10) + 1;
  if (val < 0) val = 0;
  if (val > 10) val = 10;
  return val;
}

async function loadPurpleAir() {
  try {
    const res = await fetch(PURPLE_URL);
    const data = await res.json();

    const records = Array.isArray(data)
      ? data
      : (Array.isArray(data.data) ? data.data : []);

    records.forEach(rec => {
      const lat = parseFloat(rec.lat ?? rec.Latitude ?? rec.latitude);
      const lon = parseFloat(rec.lon ?? rec.Longitude ?? rec.longitude);
      const pm  = parseFloat(rec.pm_corr);

      if (!isFinite(lat) || !isFinite(lon) || !isFinite(pm)) return;

      const eAQHI = computeEAQHI(pm);
      if (eAQHI === null) return;

      const sensorIndex = rec.sensor_index;
      const label =
        rec.name ||
        (sensorIndex != null ? `Sensor ${sensorIndex}` : "Unnamed sensor");

      const sensorObj = {
        SensorName: label,
        sensor_index: sensorIndex,
        Latitude: lat,
        Longitude: lon,
        PM2_5: pm,
        pm25: pm,
        eAQHI: eAQHI
      };
      
      // store sensor for click lookups
      window.purpleAirSensors.push(sensorObj);
      
      const marker = L.circleMarker([lat, lon], {
        radius: 4,
        fillColor: getPM25Color(pm),   // YOUR PA COLOR SCALE
        color: "#222",
        weight: 0.5,
        fillOpacity: 0.85
      });
      

      marker.feature = { properties: sensorObj };
      
      marker.bindPopup(
        `<strong>PurpleAir</strong><br>` +
        `${label}<br>` +
        (sensorIndex != null ? `Sensor index: ${sensorIndex}<br>` : "") +
        `PM₂.₅ (corr): ${pm.toFixed(1)} µg/m³`
      );
      
      window.paLayer.addLayer(marker);

      window.purpleAirMarkers.push(marker);
    });

    window.paLayer.addTo(map);

  } catch (err) {
    console.error("Error loading PurpleAir data:", err);
  }
}


// run it once map + window.paLayer exist
document.addEventListener("DOMContentLoaded", loadPurpleAir);
