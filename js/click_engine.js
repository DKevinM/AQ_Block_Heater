// =========================================================
// THIS BELONGS IN:  js/click_engine.js
// REPLACE YOUR EXISTING renderClickData WITH THIS ONE
// =========================================================

async function renderClickData(lat, lng, map) {

  // --------------------------------------------------
  // 1) MARK CLICK LOCATION
  // --------------------------------------------------
  const marker = L.marker([lat, lng]);
  markerGroup.addLayer(marker);
  existingMarkers.push(marker);

  marker.bindTooltip(
    `Your location<br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
    { sticky: true, direction: "top", opacity: 0.9 }
  ).openTooltip();

  // --------------------------------------------------
  // 2) FIND 2 CLOSEST AQHI STATIONS
  // --------------------------------------------------
  const closest = Object.values(dataByStation)
    .map(arr => {
      const aqhiObj = arr.find(d => d.ParameterName === "AQHI");
      return aqhiObj || arr[0];
    })
    .map(r => ({
      ...r,
      dist: getDistance(lat, lng, r.Latitude, r.Longitude)
    }))
    .sort((a,b) => a.dist - b.dist)
    .slice(0,2);

  closest.forEach(st => {

    let aqhiVal = parseFloat(st.Value);

    if (st.StationName.trim() === "Woodcroft") {
      console.warn("Overriding Woodcroft AQHI to null");
      aqhiVal = null;
    }

    const color = getColor(aqhiVal);

    const circle = L.circleMarker([st.Latitude, st.Longitude], {
      radius: 15,
      color: "#000",
      fillColor: color,
      weight: 3,
      fillOpacity: 0.8
    });

    markerGroup.addLayer(circle);
    stationMarkers.push(circle);

    const popupHtml = `
      <div style="font-size:0.9em;">
        <strong>${st.StationName}</strong><br>
        AQHI: ${aqhiVal ?? "N/A"}<br>
        (Click the station for full history in the main app)
      </div>
    `;

    circle.bindPopup(popupHtml, { maxWidth: 300 });
  });

  // --------------------------------------------------
  // 3) WEATHER — ONE CLEAN FETCH
  // --------------------------------------------------
  try {
    const wresp = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,` +
      `snowfall,cloudcover,uv_index,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,weathercode&timezone=America%2FEdmonton`
    );

    const wdata = await wresp.json();
    
    console.log("Weather for click:", wdata);
    
    // 1) Update BIG weather panel (if present)
    if (typeof showWeather === "function") {
      showWeather(wdata);
    }
    
    // 2) Update bottom-left mini weather box
    if (window.updateMiniWeather) {
      window.updateMiniWeather(wdata);
    }

  } catch (err) {
    console.error("Weather error:", err);
  }

  // --------------------------------------------------
  // 4) PURPLEAIR — SAFE (WON'T CRASH)
  // --------------------------------------------------
  try {
    if (typeof showPurpleAir === "function") {
      showPurpleAir(lat, lng);
    } else {
      console.warn("showPurpleAir() not available — skipping PurpleAir.");
    }
  } catch (err) {
    console.error("PurpleAir error:", err);
  }
}
