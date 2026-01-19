function showWeather(data) {

  const panel = document.querySelector("#weather-info");
  if (!panel) return;

  // ----- FIND CURRENT EDMONTON HOUR INDEX -----
  const nowYEG = new Date().toLocaleString("en-CA", {
    timeZone: "America/Edmonton"
  });

  const now = new Date(nowYEG);

  let i = 0;
  while (i < data.hourly.time.length) {
    const t = new Date(data.hourly.time[i]);
    if (t >= now) break;
    i++;
  }

  console.log("Weather index used:", i, data.hourly.time[i]);

  const get = (field) => data.hourly[field][i];

  // ----- CURRENT CONDITIONS TABLE (top) -----
  const rows = [
    ["Time", new Date().toLocaleString('en-CA',{timeZone:'America/Edmonton'})],
    ["Temperature", `${get("temperature_2m")} °C`],
    ["Humidity", `${get("relative_humidity_2m")} %`],
    ["Rain", `${get("rain")} mm`],
    ["Cloud Cover", `${get("cloudcover")} %`],
    ["Wind Speed", `${get("wind_speed_10m")} km/h`],
    ["Wind Direction", `${degToCompass(get("wind_direction_10m"))}`]
  ];

  const currentTable = rows.map(row =>
    `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td></tr>`
  ).join("");

  // ----- NEXT 6 HOURS FORECAST TABLE -----
  let forecastRows = "";

  for (let k = 0; k < 6; k++) {
    const idx = i + k;
    if (idx >= data.hourly.time.length) break;

    const time = data.hourly.time[idx].slice(11,16); // HH:MM
    const temp = Math.round(data.hourly.temperature_2m[idx]);
    const wind = Math.round(data.hourly.wind_speed_10m[idx]);
    const rain = data.hourly.rain[idx].toFixed(1);
    const dir  = degToCompass(data.hourly.wind_direction_10m[idx]);

    forecastRows += `
      <tr>
        <td>${time}</td>
        <td>${temp}°C</td>
        <td>${wind} km/h ${dir}</td>
        <td>${rain} mm</td>
      </tr>
    `;
  }

  panel.innerHTML = `
  <h3>Current Weather</h3>
  <table style="width:100%; font-size:12px;">
    <tbody>${currentTable}</tbody>
  </table>

  <div style="margin-top:8px; font-weight:700;">Next 6 Hours</div>
  <table style="width:100%; font-size:11px; border-collapse:collapse;">
    <tr>
      <th align="left">Time</th>
      <th>Temp</th>
      <th>Wind</th>
      <th>Rain</th>
    </tr>
    ${forecastRows}
  </table>
  `;
}

// ----- HELPER: degrees → N / NE / SW -----
function degToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW","N"];
  return dirs[Math.round(deg/45)];
}
