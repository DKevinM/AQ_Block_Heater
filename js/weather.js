function degToCardinal(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}




window.showWeatherForPoint = async function(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,uv_index` +
    `&timezone=America%2FEdmonton`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    updateMiniWeather(data);   // <- call the mini renderer directly
  } catch (e) {
    console.warn("Weather fetch failed:", e);
  }
};





function updateMiniWeather(data) {

  const now = new Date();
  let i = 0;

  while (i < data.hourly.time.length) {
    const t = new Date(data.hourly.time[i]);
    if (t >= now) break;
    i++;
  }

  const get = (field) => data.hourly[field][i];

  let forecastRows = "";
  for (let j = 0; j < 6; j++) {
    const t = new Date(data.hourly.time[i + j]);
    const hhmm = t.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Edmonton"
    });

    forecastRows += `
      <tr>
        <td>${hhmm}</td>
        <td>${Math.round(data.hourly.temperature_2m[i+j])}°C</td>
        <td>${Math.round(data.hourly.wind_speed_10m[i+j])} km/h
            ${degToCardinal(data.hourly.wind_direction_10m[i+j])}</td>
        <td>${data.hourly.precipitation[i+j].toFixed(1)} mm</td>
        <td>${Math.round(data.hourly.uv_index[i+j])}</td>
      </tr>
    `;
  }

  const html = `
    <table style="width:100%; font-size:12px;">
      <thead>
        <tr>
          <th>Time</th>
          <th>Temp</th>
          <th>Wind</th>
          <th>Precip</th>
          <th>UV</th>
        </tr>
      </thead>
      <tbody>
        ${forecastRows}
      </tbody>
    </table>
  `;

  const el = document.getElementById("mini-weather");
  if (el) el.innerHTML = html;

  window.updateMiniWeather = updateMiniWeather;
}
