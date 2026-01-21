function buildPopupWeatherTable(data) {
  const now = new Date();
  let i = 0;

  while (i < data.hourly.time.length) {
    if (new Date(data.hourly.time[i]) >= now) break;
    i++;
  }

  let rows = "";
  for (let j = 0; j < 6; j++) {
    const t = new Date(data.hourly.time[i + j]);
    rows += `
      <tr>
        <td>${t.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"})}</td>
        <td>${Math.round(data.hourly.temperature_2m[i+j])}°C</td>
        <td>${Math.round(data.hourly.wind_speed_10m[i+j])} km/h 
            ${degToCardinal(data.hourly.wind_direction_10m[i+j])}</td>
        <td>${data.hourly.precipitation[i+j].toFixed(1)} mm</td>
        <td>${Math.round(data.hourly.uv_index[i+j])}</td>
      </tr>
    `;
  }

  return `
    <div style="margin-top:8px;">
      <div style="font-weight:600;">Weather (next 6 hours)</div>
      <table style="width:100%; font-size:11px;">
        <tr><th>Time</th><th>Temp</th><th>Wind</th><th>Precip</th><th>UV</th></tr>
        ${rows}
      </table>
    </div>
  `;
}





async function renderClickData(lat, lng, map) {


  function getPurpleAirList() {
    if (window.purpleAirLayer && window.purpleAirLayer.getLayers) {
      return window.purpleAirLayer.getLayers()
        .map(l => l.feature?.properties || {})
        .filter(p => p.Latitude && p.Longitude);
    }
  
    if (Array.isArray(window.purpleAirSensors)) {
      return window.purpleAirSensors;
    }
  
    return [];
  }



  
  // ---- 1) Marker at clicked point ----
  const marker = L.marker([lat, lng]);
  markerGroup.addLayer(marker);
  existingMarkers.push(marker);

  // ---- 2) TWO CLOSEST AQHI STATIONS ----
  const closestStations = Object.values(dataByStation)
    .map(arr => arr.find(d => d.ParameterName === "AQHI") || arr[0])
    .map(r => ({
      station: r.StationName,
      lat: Number(r.Latitude),
      lng: Number(r.Longitude),
      aqhi: (r.Value == null || r.Value === "" ? null : Math.round(Number(r.Value))),
      dist_km: getDistance(lat, lng, r.Latitude, r.Longitude) / 1000
    }))
    .filter(s => isFinite(s.lat) && isFinite(s.lng))
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

  // ---- 3) WEATHER (panel + popup use same fetch) ----
  let currentWeather = null;
  
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation,cloudcover,` +
      `wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index` +
      `&timezone=America%2FEdmonton`
    );
  
    const data = await r.json();
  
    // 1️⃣ Extract current conditions
    if (window.extractCurrentWeather) {
      currentWeather = window.extractCurrentWeather(data);
    }
  
    // 2️⃣ Update AQHI panel weather
    if (window.renderPanelWeather) {
      window.renderPanelWeather(
        currentWeather,
        lat,
        lng,
        window.lastClickedAddress // if you already store this
      );
    }
  
    // 3️⃣ Popup forecast (UNCHANGED)
    weatherHtml = buildPopupWeatherTable(data);
  
  } catch (e) {
    console.warn("Weather fetch failed", e);
  }


  // ---- 3c) REVERSE GEOCODE CLICK LOCATION ----
  let addressText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json`
    );
    const geo = await r.json();
  
    if (geo && geo.display_name) {
      addressText = geo.display_name;
    }
  } catch (e) {
    console.warn("Reverse geocoding failed", e);
  }
  
  // Push address into AQHI panel (same panel as weather)
  if (typeof window.updatePanelLocation === "function") {
    window.updatePanelLocation(addressText, lat, lng);
  }

  


  // ---- 4) THREE CLOSEST PURPLEAIR (FIXED DISTANCE LOGIC) ---- 
  let closestPA = [];
  
  try {
    const paList = getPurpleAirList();
  
    closestPA = paList
      .map(s => ({
        name: s.SensorName || s.Label || s.name || "PurpleAir",
        pm: s.PM2_5 || s.pm25 || s.pm2_5 || null,
        lat: Number(s.Latitude ?? s.lat),
        lng: Number(s.Longitude ?? s.lng),
        dist_km: getDistance(lat, lng,
          Number(s.Latitude ?? s.lat),
          Number(s.Longitude ?? s.lng)) / 1000
      }))
      .filter(s => isFinite(s.lat) && isFinite(s.lng))
      .sort((a,b) => a.dist_km - b.dist_km)
      .slice(0,3);
  
  } catch (e) {
    console.warn("PurpleAir nearest lookup failed:", e);
  }
  
  if (typeof showPurpleAir === "function") {
    try { showPurpleAir(lat, lng); } catch (e) {}
  }



  
  let weatherHtml = "<div style='margin-top:6px;'>Weather unavailable</div>";
  
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,uv_index` +
      `&timezone=America%2FEdmonton`
    );
    const data = await r.json();
    weatherHtml = buildPopupWeatherTable(data);
  } catch(e) {
    console.warn("Popup weather failed", e);
  }



  // ---- 3b) UPDATE TOP-LEFT AQHI PANEL WITH CURRENT WEATHER ----
  try {
    const now = new Date();
    let i = 0;
  
    while (i < data.hourly.time.length) {
      if (new Date(data.hourly.time[i]) >= now) break;
      i++;
    }
  
    const currentWeather = {
      temp: Math.round(data.hourly.temperature_2m[i]),
      rh: data.hourly.relative_humidity_2m
        ? Math.round(data.hourly.relative_humidity_2m[i])
        : null,
      precip: data.hourly.precipitation[i].toFixed(1),
      cloud: data.hourly.cloudcover
        ? Math.round(data.hourly.cloudcover[i])
        : null,
      uv: data.hourly.uv_index
        ? data.hourly.uv_index[i].toFixed(1)
        : null,
      wind: Math.round(data.hourly.wind_speed_10m[i]),
      gust: data.hourly.wind_gusts_10m
        ? Math.round(data.hourly.wind_gusts_10m[i])
        : null,
      dir: data.hourly.wind_direction_10m[i]
    };
  
    if (typeof window.renderPanelWeather === "function") {
      window.renderPanelWeather(currentWeather, lat, lng);
    }
  
  } catch (e) {
    console.warn("Panel weather update failed", e);
  }
  
  

  // ---- 5) CLICK POPUP TABLE ----
  const stRows = closestStations.map(s => `
    <tr>
      <td>${s.station}</td>
      <td>${s.aqhi ?? "—"}</td>
      <td>${s.dist_km.toFixed(1)} km</td>
    </tr>
  `).join("");

  const paRows = (closestPA.length
    ? closestPA
    : [{name:"(PurpleAir not loaded)", pm:"—", dist_km:0}]
  ).map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${(p.pm == null ? "—" : Number(p.pm).toFixed(1))}</td>
      <td>${p.dist_km ? p.dist_km.toFixed(1)+" km" : ""}</td>
    </tr>
  `).join("");

  const popupHtml = `
    <div style="font-size:12px; line-height:1.25;">
  
      <div style="font-weight:700; margin-bottom:6px;">
        Nearest stations & sensors
      </div>
  
      <div style="font-weight:600; margin:6px 0 3px;">
        AQHI stations (2)
      </div>
      <table style="width:100%; font-size:11px;">
        <tr>
          <th align="left">Station</th>
          <th align="left">AQHI</th>
          <th align="left">Dist</th>
        </tr>
        ${stRows}
      </table>
  
      <div style="font-weight:600; margin:8px 0 3px;">
        PurpleAir (3)
      </div>
      <table style="width:100%; font-size:11px;">
        <tr>
          <th align="left">Sensor</th>
          <th align="left">PM2.5</th>
          <th align="left">Dist</th>
        </tr>
        ${paRows}
      </table>
  
      ${weatherHtml}
  
    </div>
  `;


  marker.bindPopup(popupHtml, { maxWidth: 340 }).openPopup();
}
