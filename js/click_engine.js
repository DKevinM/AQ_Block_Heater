async function renderClickData(lat, lng, map) {

  // 1) Marker at clicked point
  const marker = L.marker([lat, lng]);
  markerGroup.addLayer(marker);
  existingMarkers.push(marker);

  // ---------- 2 CLOSEST AQHI STATIONS ----------
  const closestStations = Object.values(dataByStation)
    .map(arr => arr.find(d => d.ParameterName === "AQHI") || arr[0])
    .map(r => ({
      station: r.StationName,
      lat: Number(r.Latitude),
      lng: Number(r.Longitude),
      aqhi: (r.Value == null || r.Value === "" ? null : Math.round(Number(r.Value))),
      dist_km: getDistance(lat, lng, r.Latitude, r.Longitude) / 1000
    }))
    .sort((a,b) => a.dist_km - b.dist_km)
    .slice(0,2);

  // draw circles for those stations
  closestStations.forEach(st => {
    const circle = L.circleMarker([st.lat, st.lng], {
      radius: 15,
      color: "#000",
      fillColor: getColor(st.aqhi),
      weight: 3,
      fillOpacity: 0.8
    });
    markerGroup.addLayer(circle);
    stationMarkers.push(circle);
  });

  // ---------- WEATHER (ONCE) ----------
  try {
    const wresp = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,` +
      `snowfall,cloudcover,uv_index,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,weathercode&timezone=America%2FEdmonton`
    );
    const wdata = await wresp.json();

    if (typeof showWeather === "function") showWeather(wdata);
    if (window.updateMiniWeather) window.updateMiniWeather(wdata);

  } catch (err) {
    console.error("Weather error:", err);
  }

  // ---------- 3 CLOSEST PURPLEAIR (SAFE + GENERIC) ----------
  // This tries to use whatever your PurpleAir script exposes.
  let closestPA = [];
  try {
    if (typeof window.getClosestPurpleAir === "function") {
      // if you already have a helper, use it
      closestPA = window.getClosestPurpleAir(lat, lng, 3) || [];
    } else if (Array.isArray(window.purpleAirSensors)) {
      // or use a global array if you store sensors there
      closestPA = window.purpleAirSensors
        .map(s => ({
          name: s.name || s.SensorName || s.Label || "PurpleAir",
          pm: s.pm25 ?? s.PM2_5 ?? s.pm2_5 ?? null,
          lat: Number(s.lat ?? s.Latitude),
          lng: Number(s.lng ?? s.Longitude),
          dist_km: getDistance(lat, lng, s.lat ?? s.Latitude, s.lng ?? s.Longitude) / 1000
        }))
        .filter(s => isFinite(s.lat) && isFinite(s.lng))
        .sort((a,b) => a.dist_km - b.dist_km)
        .slice(0,3);
    }
  } catch (e) {
    console.warn("PurpleAir nearest lookup failed:", e);
  }

  // Keep your existing PurpleAir plotting if it exists
  if (typeof showPurpleAir === "function") {
    try { showPurpleAir(lat, lng); } catch (e) {}
  }

  // ---------- CLICK POPUP TABLE ----------
  const stRows = closestStations.map(s => `
    <tr>
      <td>${s.station}</td>
      <td>${s.aqhi ?? "—"}</td>
      <td>${s.dist_km.toFixed(1)} km</td>
    </tr>
  `).join("");

  const paRows = (closestPA.length ? closestPA : [{name:"(PurpleAir not loaded)", pm:"—", dist_km:0}]).map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${(p.pm == null || p.pm === "" ? "—" : Number(p.pm).toFixed(1))}</td>
      <td>${p.dist_km ? p.dist_km.toFixed(1)+" km" : ""}</td>
    </tr>
  `).join("");

  const popupHtml = `
    <div style="font-size:12px; line-height:1.25;">
      <div style="font-weight:700; margin-bottom:6px;">Nearest stations & sensors</div>

      <div style="font-weight:600; margin:6px 0 3px;">AQHI stations (2)</div>
      <table style="width:100%; font-size:11px;">
        <tr><th align="left">Station</th><th align="left">AQHI</th><th align="left">Dist</th></tr>
        ${stRows}
      </table>

      <div style="font-weight:600; margin:8px 0 3px;">PurpleAir (3)</div>
      <table style="width:100%; font-size:11px;">
        <tr><th align="left">Sensor</th><th align="left">PM2.5</th><th align="left">Dist</th></tr>
        ${paRows}
      </table>
    </div>
  `;

  marker.bindPopup(popupHtml, { maxWidth: 340 }).openPopup();
}
