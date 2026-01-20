function compassDir(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round((Number(deg) % 360) / 45) % 8];
}

function pad2(x){ return String(x).padStart(2,"0"); }

// Build "YYYY-MM-DDTHH:00" in America/Edmonton
function edmontonHourKeyNow() {
  const s = new Date().toLocaleString("sv-SE", { timeZone: "America/Edmonton" });
  // sv-SE => "YYYY-MM-DD HH:mm:ss"
  const [d, t] = s.split(" ");
  const hh = t.slice(0,2);
  return `${d}T${hh}:00`;
}

// Find first hourly index with time >= Edmonton hour key
function findStartIndex(hourlyTimes) {
  const key = edmontonHourKeyNow();
  for (let i = 0; i < hourlyTimes.length; i++) {
    if (hourlyTimes[i] >= key) return i;
  }
  return 0;
}

// BIG PANEL: Current only (you already like this)
function showWeather(data) {
  const i = findStartIndex(data.hourly.time);

  const rows = [
    ["Time", new Date().toLocaleString("en-CA", { timeZone: "America/Edmonton" })],
    ["Temperature", `${Math.round(data.hourly.temperature_2m[i])} °C`],
    ["Humidity", `${Math.round(data.hourly.relative_humidity_2m[i])} %`],
    ["Rain", `${Number(data.hourly.rain[i] ?? 0).toFixed(1)} mm`],
    ["Cloud Cover", `${Math.round(data.hourly.cloudcover[i])} %`],
    ["Wind", `${Math.round(data.hourly.wind_speed_10m[i])} km/h ${compassDir(data.hourly.wind_direction_10m[i])}`],
  ];

  const html = rows.map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td></tr>`).join("");

  const host = document.querySelector("#weather-info");
  if (!host) return;

  host.innerHTML = `
    <h3>Current Weather</h3>
    <table><tbody>${html}</tbody></table>
  `;
}

// MINI: table only, 6 hours starting “now”
window.updateMiniWeather = function(w) {
  const el = document.getElementById("mini-weather");
  if (!el) return;

  const i0 = findStartIndex(w.hourly.time);

  let rows = "";
  for (let k = 0; k < 6; k++) {
    const i = i0 + k;
    if (i >= w.hourly.time.length) break;

    const timeStr = w.hourly.time[i]; // "YYYY-MM-DDTHH:MM"
    const hhmm = timeStr.slice(11,16);

    const temp = Math.round(w.hourly.temperature_2m[i]);
    const wind = Math.round(w.hourly.wind_speed_10m[i]);
    const dir  = compassDir(w.hourly.wind_direction_10m[i]);
    const rain = Number(w.hourly.rain[i] ?? 0).toFixed(1);

    rows += `
      <tr>
        <td>${hhmm}</td>
        <td>${temp}°C</td>
        <td>${wind} km/h</td>
        <td>${dir}</td>
        <td>${rain} mm</td>
      </tr>
    `;
  }

  el.innerHTML = `
    <table style="width:100%; font-size:11px; border-collapse:collapse;">
      <tr>
        <th style="text-align:left;">Time</th>
        <th style="text-align:left;">Temp</th>
        <th style="text-align:left;">Wind</th>
        <th style="text-align:left;">Dir</th>
        <th style="text-align:left;">Rain</th>
      </tr>
      ${rows}
    </table>
  `;
};
