// ===============================
// calgary_aqhi.js  (CLEAN VERSION)
// ===============================

window.calgaryAQHI = { current: null, forecast: null };

function safeRound(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function pickPeriodIndexByCategory(p, category) {
  const labels = [];
  for (let i = 1; i <= 5; i++)
    labels.push(((p[`p${i}_label`] || "") + "").toLowerCase());

  const has = (i, s) => labels[i - 1].includes(s);

  const isToday = i =>
    has(i, "today") ||
    has(i, "this afternoon") ||
    (has(i, "this evening") && !has(i, "tonight"));

  const isTonight = i => has(i, "tonight") || has(i, "overnight");
  const isTomorrow = i => has(i, "tomorrow") && !has(i, "night");

  let test;
  if (category === "today") test = isToday;
  else if (category === "tonight") test = isTonight;
  else if (category === "tomorrow") test = isTomorrow;

  if (test) for (let i = 1; i <= 5; i++) if (test(i)) return i;

  return ({ today: 1, tonight: 2, tomorrow: 3 })[category] || 1;
}

// ---------- KEY FIX: handle BOTH flat + nested data ----------
function getAQHI(p, idx) {
  if (!p) return null;

  // Case A — your GitHub (FLAT) format
  if (p[`p${idx}_aqhi`] !== undefined) {
    return safeRound(p[`p${idx}_aqhi`]);
  }

  // Case B — true nested CAN_AQHI
  if (p.forecast_period) {
    const per = p.forecast_period[`period_${idx}`];
    if (per && per.aqhi != null) return Math.round(Number(per.aqhi));
  }

  return null;
}

function getLabel(p, idx) {
  if (!p) return null;

  if (p[`p${idx}_label`]) return p[`p${idx}_label`];

  if (p.forecast_period) {
    const per = p.forecast_period[`period_${idx}`];
    if (per && per.forecast_period_en) return per.forecast_period_en;
  }

  return null;
}

// ================= LOAD DATA =================
async function loadCalgaryAQHI() {

  const [obs, fc] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.geojson").then(r => r.json()),
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.geojson").then(r => r.json())
  ]);

  const obsCal = (obs.features || [])
    .map(f => f.properties)
    .filter(p => /calgary/i.test(p.name));

  const fcCal = (fc.features || [])
    .map(f => f.properties)
    .filter(p => /calgary/i.test(p.name));

  obsCal.sort((a,b) =>
    new Date(b.observed || b.observation_datetime) -
    new Date(a.observed || a.observation_datetime)
  );

  fcCal.sort((a,b) =>
    new Date(b.forecast_datetime) -
    new Date(a.forecast_datetime)
  );

  window.calgaryAQHI.current = obsCal.length ? {
    station: obsCal[0].name,
    value: safeRound(obsCal[0].aqhi),
    time: obsCal[0].observed || obsCal[0].observation_datetime
  } : null;

  window.calgaryAQHI.forecast = fcCal.length ? fcCal[0] : null;

  console.log("Calgary AQHI LOADED:", window.calgaryAQHI);
}




async function loadCalgaryFromAB() {

  const url =
  "https://data.environment.alberta.ca/EdwServices/aqhi/odata/CommunityAqhis?$format=json";

  const r = await fetch(url);
  const data = await r.json();

  const cal = data.value.find(c =>
    c.CommunityName.toLowerCase() === "calgary"
  );

  if (!cal) {
    console.error("No Calgary found in AB AQHI feed");
    return;
  }

  window.calgaryAQHI = {
    current: {
      station: "Calgary",
      value: Number(cal.Aqhi),
      time: cal.ReadingDate
    },
    forecast: {
      today: Number(cal.ForecastToday),
      tonight: Number(cal.ForecastTonight),
      tomorrow: Number(cal.ForecastTomorrow)
    }
  };

  console.log("Calgary AQHI from Alberta:", window.calgaryAQHI);
}





// ================= DRAW PANEL =================
function drawCalgaryPanel() {

  const C = window.calgaryAQHI;
  if (!C || !C.current) return;

  const v0 = Math.round(C.current.value);
  const fToday = Math.round(C.forecast.today);
  const fTonight = Math.round(C.forecast.tonight);
  const fTomorrow = Math.round(C.forecast.tomorrow);


  const html = `

  <div style="font-size:16px; font-weight:700;">
    Calgary Air Quality (AQHI)
  </div>

  <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; margin-top:10px;">

    <div style="text-align:center;">
      <div style="background:${getColor(v0)}; width:70px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${v0}
      </div>
      <div style="font-size:12px;">Current</div>
    </div>

    <div style="text-align:center;">
      <div style="background:${getColor(fToday)}; width:70px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${fToday}
      </div>
      <div style="font-size:11px;">Today</div>
    </div>

    <div style="text-align:center;">
      <div style="background:${getColor(fTonight)}; width:70px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${fTonight}
      </div>
      <div style="font-size:11px;">Tonight</div>
    </div>

    <div style="text-align:center;">
      <div style="background:${getColor(fTomorrow)}; width:70px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${fTomorrow}
      </div>
      <div style="font-size:11px;">Tomorrow</div>
    </div>
  </div>

  <div style="margin-top:10px;">
    <strong>Last updated:</strong> ${new Date(C.current.time).toLocaleString()}
  </div>


  <div id="panel-weather"
       style="
         margin-top:10px;
         padding-top:8px;
         border-top:1px solid #ccc;
         font-size:13px;
       ">
    <div style="color:#666; font-style:italic;">
      Click map for current weather
    </div>
  </div>

  
  <div style="margin-top:10px;">
    <div style="font-weight:600;">Wildfire external resources</div>
  
    <a href="https://firesmoke.ca/forecasts/current/" target="_blank">
      FireSmoke Canada – Current Forecast
    </a><br>
  
    <a href="https://eer.cmc.ec.gc.ca/mandats/AutoSim/ops/Fire_CA_HRDPS_CWFIS/latest/Canada/latest/img/Canada/anim.html" target="_blank">
      ECCC Wildfire Dashboard
    </a>
  </div>
  <hr style="margin:8px 0; border:0; border-top:1px solid #ddd;">
  <div style="margin-top:10px;">
    <div style="font-weight:600;">Festival resources</div>
  
    <a href="https://calgaryfolkfest.com/block-heater/info" target="_blank">
      Calgary Folk Fest – Block Heater Info
    </a>
  </div>

  `;
  document.getElementById("calgary-content").innerHTML = html;
}



function renderPanelWeather(w, lat, lng, address) {
  const el = document.getElementById("panel-weather");
  if (!el || !w) return;

  el.innerHTML = `
    <div style="font-weight:600; margin-bottom:4px;">Current Weather</div>
    <table style="width:100%; font-size:12px; border-collapse:collapse;">
      <tr>
        <td style="padding:2px 6px 2px 0;">Temperature</td>
        <td style="text-align:center;">${w.temp} °C</td>
      </tr>
      <tr>
        <td>Humidity</td>
        <td style="text-align:center;">${w.rh} %</td>
      </tr>
      <tr>
        <td>Precipitation</td>
        <td style="text-align:center;">${w.precip} mm</td>
      </tr>
      <tr>
        <td>Cloud cover</td>
        <td style="text-align:center;">${w.cloud ?? "–"} %</td>
      </tr>
      <tr>
        <td>UV index</td>
        <td style="text-align:center;">${w.uv}</td>
      </tr>
      <tr>
        <td>Wind</td>
        <td style="text-align:center;">
          ${w.wind} km/h ${degToCardinal(w.dir)}
        </td>
      </tr>
      ${w.gust ? `
      <tr>
        <td>Gusts</td>
        <td style="text-align:center;">${w.gust} km/h</td>
      </tr>` : ""}
    </table>
  `;
}


window.updatePanelLocation = function(address, lat, lng) {
  const panel = document.getElementById("calgary-panel");
  if (!panel) return;

  let loc = panel.querySelector(".loc-line");

  if (!loc) {
    loc = document.createElement("div");
    loc.className = "loc-line";
    panel.appendChild(loc);
  }

  loc.innerHTML = `
    <b>Location Picked:</b><br>
    ${address}<br>
    <span style="font-size:0.8em;">
      (${lat.toFixed(4)}, ${lng.toFixed(4)})
    </span>
  `;
};



// ================= BOOTSTRAP =================
loadCalgaryFromAB()
  .then(drawCalgaryPanel)
  .catch(err => console.error("Calgary AQHI failed:", err));

window.refreshCalgaryPanel = async function () {
  await loadCalgaryFromAB();
  drawCalgaryPanel();

document.getElementById("calgary-content").innerHTML = html;
  
};

