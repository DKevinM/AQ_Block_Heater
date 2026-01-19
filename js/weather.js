function showWeather(data) {
  const edmontonNow = new Date();
  let i = 0;
  while (i < data.hourly.time.length) {
    const t = new Date(data.hourly.time[i]);
    if (t >= edmontonNow) break;
    i++;
  }

  const get = (field) => data.hourly[field][i];

  const rows = [
    ["Time", new Date().toLocaleString('en-CA',{timeZone:'America/Edmonton'})],
    ["Temperature", `${get("temperature_2m")} °C`],
    ["Humidity", `${get("relative_humidity_2m")} %`],
    ["Rain", `${get("rain")} mm`],
    ["Cloud Cover", `${get("cloudcover")} %`],
    ["Wind Speed", `${get("wind_speed_10m")} km/h`],
    ["Wind Direction", `${get("wind_direction_10m")}°`]
  ];

  const currentTable = rows.map(row =>
    `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td></tr>`
  ).join("");

  document.querySelector("#weather-info").innerHTML = `
    <h3>Current Weather</h3>
    <table><tbody>${currentTable}</tbody></table>
  `;
}
