function degToCardinal(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}

function showWeather(data) {

  const now = new Date();
  let i = 0;

  while (i < data.hourly.time.length) {
    const t = new Date(data.hourly.time[i]);
    if (t >= now) break;
    i++;
  }

  const get = (field) => data.hourly[field][i];

  const currentRows = `
    <tr><td><strong>Time</strong></td><td>${now.toLocaleString('en-CA',{timeZone:'America/Edmonton'})}</td></tr>
    <tr><td><strong>Temperature</strong></td><td>${get("temperature_2m")} °C</td></tr>
    <tr><td><strong>Humidity</strong></td><td>${get("relative_humidity_2m")} %</td></tr>
    <tr><td><strong>Precipitation</strong></td><td>${get("precipitation")} mm</td></tr>
    <tr><td><strong>Cloud</strong></td><td>${get("cloudcover")} %</td></tr>
    <tr><td><strong>Wind</strong></td><td>
      ${Math.round(get("wind_speed_10m"))} km/h ${degToCardinal(get("wind_direction_10m"))}
    </td></tr>
    <tr><td><strong>UV Index</strong></td><td>${Math.round(get("uv_index"))}</td></tr>
  `;

  let forecastRows = "";
  for (let j = 1; j <= 6; j++) {
    const t = new Date(data.hourly.time[i+j]);
    const hhmm = t.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit",timeZone:"America/Edmonton"});

    forecastRows += `
      <tr>
        <td>${hhmm}</td>
        <td>${Math.round(data.hourly.temperature_2m[i+j])}°C</td>
        <td>${Math.round(data.hourly.wind_speed_10m[i+j])} km/h</td>
        <td>${data.hourly.precipitation[i+j].toFixed(1)} mm</td>
      </tr>
    `;
  }

  document.querySelector("#weather-info").innerHTML = `
    <h3 style="margin:0;">Current Weather</h3>
    <table><tbody>${currentRows}</tbody></table>

    <h3 style="margin-top:8px;">Next 6 Hours</h3>
    <table>
      <thead>
        <tr><th>Time</th><th>Temp</th><th>Wind</th><th>Precip</th></tr>
      </thead>
      <tbody>${forecastRows}</tbody>
    </table>
  `;
}
