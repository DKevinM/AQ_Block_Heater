function degToCardinal(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}

function findNearestHourIndex(times) {
  const now = new Date();
  let i = 0;
  while (i < times.length) {
    const t = new Date(times[i]);
    if (t >= now) break;
    i++;
  }
  return Math.max(0, i - 1);
}

function showWeather(data) {

  const i = findNearestHourIndex(data.hourly.time);

  const get = f => data.hourly[f][i];

  const currentRows = `
    <tr><td><strong>Time</strong></td>
        <td>${new Date(data.hourly.time[i]).toLocaleString('en-CA',{timeZone:'America/Edmonton'})}</td></tr>
    <tr><td><strong>Temperature</strong></td><td>${get("temperature_2m")} °C</td></tr>
    <tr><td><strong>Humidity</strong></td><td>${get("relative_humidity_2m")} %</td></tr>
    <tr><td><strong>Rain</strong></td><td>${get("rain")} mm</td></tr>
    <tr><td><strong>Cloud</strong></td><td>${get("cloudcover")} %</td></tr>
    <tr><td><strong>Wind</strong></td>
        <td>${get("wind_speed_10m")} km/h ${degToCardinal(get("wind_direction_10m"))}</td></tr>
  `;

  let forecastRows = "";
  for (let j = 1; j <= 6; j++) {
    const t = new Date(data.hourly.time[i+j]);
    const hhmm = t.toLocaleTimeString("en-CA",{
      hour:"2-digit", minute:"2-digit", timeZone:"America/Edmonton"
    });

    forecastRows += `
      <tr>
        <td>${hhmm}</td>
        <td>${Math.round(data.hourly.temperature_2m[i+j])}°C</td>
        <td>${Math.round(data.hourly.wind_speed_10m[i+j])} km/h</td>
        <td>${data.hourly.rain[i+j].toFixed(1)} mm</td>
      </tr>
    `;
  }

  const html = `
    <h3>Current Weather</h3>
    <table><tbody>${currentRows}</tbody></table>

    <h3 style="margin-top:8px;">Next 6 Hours</h3>
    <table>
      <thead>
        <tr><th>Time</th><th>Temp</th><th>Wind</th><th>Rain</th></tr>
      </thead>
      <tbody>${forecastRows}</tbody>
    </table>
  `;

  document.querySelector("#weather-info").innerHTML = html;

  // ---- UPDATE MINI-WEATHER INSIDE CALGARY PANEL ----
  if (document.getElementById("mini-weather")) {
    document.getElementById("mini-weather").innerHTML = `
      <table style="width:100%; font-size:12px;">
        <tbody>
          ${currentRows}
        </tbody>
      </table>
      <hr>
      <table style="width:100%; font-size:12px;">
        <thead>
          <tr><th>Time</th><th>Temp</th><th>Wind</th><th>Rain</th></tr>
        </thead>
        <tbody>
          ${forecastRows}
        </tbody>
      </table>
    `;
  }
}
