async function renderClickData(lat, lng, map) {

  // 1) Add marker at clicked point → use markerGroup
  const marker = L.marker([lat, lng]);
  markerGroup.addLayer(marker);
  existingMarkers.push(marker);

  marker.bindTooltip(
    `Your location<br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
    { sticky: true, direction: "top", opacity: 0.9 }
  ).openTooltip();

  // ---------- FIND 2 CLOSEST AQHI STATIONS ----------
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

    const color = getAQHIColor(aqhiVal);

    const circle = L.circleMarker([st.Latitude, st.Longitude], {
      radius: 15,
      color: "#000",
      fillColor: color,
      weight: 3,
      fillOpacity: 0.8
    });

    // 👉 ADD TO LAYER GROUP (not map)
    markerGroup.addLayer(circle);
    stationMarkers.push(circle);

    window.fetchRecentStationData(st.StationName)
      .then(html => circle.bindPopup(html, { maxWidth: 300 }));
  });

  // ---------- WEATHER ----------
  try {
    const wresp = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,` +
      `snowfall,cloudcover,uv_index,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,weathercode&timezone=America%2FEdmonton`
    );

    const wdata = await wresp.json();
    showWeather(wdata);

  } catch (err) {
    console.error("Error fetching weather data", err);
  }

  // ---------- PURPLEAIR ----------
  showPurpleAir(lat, lng);
}
