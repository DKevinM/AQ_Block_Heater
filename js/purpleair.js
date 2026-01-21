// ---------- PURPLEAIR LOADER ----------

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

      const color = getColor(String(eAQHI));

      const marker = L.circleMarker([lat, lon], {
        radius: 4,
        fillColor: color,
        color: "#222",
        weight: 0.5,
        fillOpacity: 0.85
      }).bindPopup(
        `<strong>PurpleAir</strong><br>` +
        `${label}<br>` +
        (sensorIndex != null ? `Sensor index: ${sensorIndex}<br>` : "") +
        `eAQHI: ${eAQHI}<br>` +
        `PM₂.₅ (corr): ${pm.toFixed(1)} µg/m³` +
        `<hr>` +
        `<a href="/AQHI.forecast/history/sensor_compare.html?sensor_index=${sensorIndex}"
           target="_blank">
           View historical PM2.5
        </a>`
      );

      // IMPORTANT: add to your existing layer group
      paLayer.addLayer(marker);
      window.purpleAirMarkers.push(marker);
    });

    paLayer.addTo(map);

  } catch (err) {
    console.error("Error loading PurpleAir data:", err);
  }
}

window.plotPurpleAirSensors = function () {
  if (!window.purpleAirSensors || !map) return;

  if (!window.purpleAirLayer) {
    window.purpleAirLayer = L.layerGroup();
  }

  window.purpleAirLayer.clearLayers();

  window.purpleAirSensors.forEach(s => {
    if (!s.lat || !s.lng) return;

    const pm = s.pm25 ?? s.PM2_5 ?? null;

    const m = L.circleMarker([s.lat, s.lng], {
      radius: 5,
      fillColor: pm != null ? getPAColor(pm) : "#aaa",
      color: "#222",
      weight: 1,
      fillOpacity: 0.8
    });

    m.feature = { properties: s };   // ← IMPORTANT FOR CLICKS
    window.purpleAirLayer.addLayer(m);
  });

  window.purpleAirLayer.addTo(map);
};

// run it once map + paLayer exist
document.addEventListener("DOMContentLoaded", loadPurpleAir);
