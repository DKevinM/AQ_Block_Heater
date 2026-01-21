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
  <div id="calgary-panel" style="
      position: fixed;
      top: 15px;
      left: 15px;
      background: white;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #999;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      max-width: 420px;
      font-family: Arial;
      z-index: 9999;
  ">

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
    <div style="font-weight:600;">Wildfire & Smoke</div>
    <a href="https://firesmoke.ca/forecasts/current/" target="_blank">
      FireSmoke Canada – Current Forecast
    </a><br>
    <a href="https://weather.gc.ca/firework/index_e.html" target="_blank">
      ECCC Wildfire Dashboard
    </a>
  </div>

  </div>
  `;

  document.getElementById("calgary-panel")?.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}



function renderPanelWeather(w, lat, lng, address) {
  const el = document.getElementById("panel-weather");
  if (!el || !w) return;

  el.innerHTML = `
    <div><b>Current Weather</b></div>
    <div><b>Location:</b> ${address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</div>

    <div style="margin-top:6px;">
      <div><b>Temperature:</b> ${w.temp} °C</div>
      <div><b>Humidity:</b> ${w.rh} %</div>
      <div><b>Precipitation:</b> ${w.precip} mm</div>
      <div><b>Cloud Cover:</b> ${w.cloud ?? "–"} %</div>
      <div><b>UV Index:</b> ${w.uv}</div>
      <div><b>Wind:</b> ${w.wind} km/h ${degToCardinal(w.dir)}</div>
      ${w.gust ? `<div><b>Gusts:</b> ${w.gust} km/h</div>` : ""}
    </div>
  `;
}


window.updatePanelLocation = function(address, lat, lng) {
  const panel = document.getElementById("calgary-panel");
  if (!panel) return;

  let loc = panel.querySelector(".loc-line");

  if (!loc) {
    loc = document.createElement("div");
    loc.className = "loc-line";
    loc.style.marginBottom = "6px";
    loc.style.fontSize = "0.85em";
    loc.style.color = "#555";
    panel.insertBefore(loc, panel.firstChild.nextSibling);
  }

  loc.innerHTML = `
    <b>Location:</b><br>
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
};

