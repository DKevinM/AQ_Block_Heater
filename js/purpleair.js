// ---------------------------------------------
// PurpleAir loader for click events
// ---------------------------------------------
async function showPurpleAir(lat, lng) {

  const PURPLE_URL =
    "https://raw.githubusercontent.com/DKevinM/AB_datapull/main/data/AB_PM25_map.json";

  try {
    const res = await fetch(PURPLE_URL);
    const data = await res.json();

    const records = Array.isArray(data)
      ? data
      : (Array.isArray(data.data) ? data.data : []);

    records.forEach(rec => {
      const lat2 = parseFloat(rec.lat ?? rec.Latitude ?? rec.latitude);
      const lon2 = parseFloat(rec.lon ?? rec.Longitude ?? rec.longitude);
      const pm   = parseFloat(rec.pm_corr);

      if (!isFinite(lat2) || !isFinite(lon2) || !isFinite(pm)) return;

      // eAQHI estimate
      let eAQHI = Math.floor(pm / 10) + 1;
      if (eAQHI < 0) eAQHI = 0;
      if (eAQHI > 10) eAQHI = 10;

      const label =
        rec.name ||
        (rec.sensor_index != null
          ? `Sensor ${rec.sensor_index}`
          : "PurpleAir sensor");

      const color = getColor(String(eAQHI));

      const marker = L.circleMarker([lat2, lon2], {
        radius: 4,
        fillColor: color,
        color: "#222",
        weight: 0.5,
        fillOpacity: 0.85
      }).bindPopup(
        `<strong>PurpleAir</strong><br>` +
        `${label}<br>` +
        `eAQHI: ${eAQHI}<br>` +
        `PM₂.₅ (corr): ${pm.toFixed(1)} µg/m³`
      );

      // 👉 IMPORTANT: add to your PurpleAir layer
      paLayer.addLayer(marker);
      window.purpleAirMarkers.push(marker);
    });

  } catch (err) {
    console.error("Error loading PurpleAir data:", err);
  }
}
