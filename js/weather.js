function compassDir(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// BIG PANEL
function showWeather(data) {

  const now = new Date();
  let i = 0;

  while (i < data.hourly.time.length) {
    const t = new Date(data.hourly.time[i]);
    if (t >= now) break;
    i++;
  }

  const get = f => data.hourly[f][i];

  document.querySelector("#weather-info").innerHTML = `
    <h3>Current Weather</h3>
    <table>
      <tr><td><strong>Time</strong></td><td>${now.toLocaleString('en-CA',{timeZone:'America/Edmonton'})}</td></tr>
      <tr><td>Temperature</td><td>${Math.round(get("temperature_2m"))} °C</td></tr>
      <tr><td>Humidity</td><td>${Math.round(get("relative_humidity_2m"))} %</td></tr>
      <tr><td>Rain</td><td>${get("rain").toFixed(1)} mm</td></tr>
      <tr><td>Cloud</td><td>${Math.round(get("cloudcover"))} %</td></tr>
      <tr><td>Wind</td><td>${Math.round(get("wind_speed_10m"))} km/h ${compassDir(get("wind_direction_10m"))}</td></tr>
    </table>
  `;
}

// MINI PANEL (6-HOUR FORECAST FROM NOW)
window.updateMiniWeather = function(w) {

  const el = document.getElementById("mini-weather");
  if (!el) return;

  const now = new Date();
  let i = 0;

  while (i < w.hourly.time.length) {
    const t = new Date(w.hourly.time[i]);
    if (t >= now) break;
    i++;
  }

  let rows = "";

  for (let k = 0; k < 6; k++) {
    const t = new Date(w.hourly.time[i + k]);
    const hhmm = t.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit",timeZone:"America/Edmonton"});
    const temp = Math.round(w.hourly.temperature_2m[i + k]);
    const wind = Math.round(w.hourly.wind_speed_10m[i + k]);
    const rain = w.hourly.rain[i + k].toFixed(1);
    const dir = compassDir(w.hourly.wind_direction_10m[i + k]);

    rows += `
      <tr>
        <td>${hhmm}</td>
        <td>${temp}°C</td>
        <td>${wind} km/h ${dir}</td>
        <td>${rain} mm</td>
      </tr>
    `;
  }

  el.innerHTML = `
    <table style="width:100%; font-size:11px;">
      <tr><th>Time</th><th>Temp</th><th>Wind</th><th>Rain</th></tr>
      ${rows}
    </table>
  `;
};
