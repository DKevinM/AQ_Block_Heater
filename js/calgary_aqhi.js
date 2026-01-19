// ========================================================
// CALGARY AQHI PANEL — CORRECT VERSION (GEOJSON + LABEL AWARE)
// ========================================================

let calgaryAQHI = {
  current: null,
  forecast: null   // keep FULL properties object
};

// --------------------------------------------------------
// HELPER: same logic as CAN_AQHI map
// --------------------------------------------------------
function pickPeriodIndexByCategory(p, category){
  const labels = [];
  for (let i=1;i<=5;i++){
    const lbl = (p[`p${i}_label`] || '').toString().toLowerCase();
    labels.push(lbl);
  }

  const has = (i, s) => labels[i-1].includes(s);

  const isToday = i =>
    has(i,'today') || has(i,'this afternoon') || has(i,'this morning');

  const isTonight = i =>
    has(i,'tonight') || has(i,'overnight');

  const isTomorrow = i =>
    has(i,'tomorrow') && !has(i,'night');

  const isTomorrowNight = i =>
    has(i,'tomorrow night') || has(i,'tomorrow evening');

  let test;
  if (category==='today') test = isToday;
  else if (category==='tonight') test = isTonight;
  else if (category==='tomorrow') test = isTomorrow;
  else if (category==='tomorrow_night') test = isTomorrowNight;

  if (test){
    for (let i=1;i<=5;i++) if (test(i)) return i;
  }

  return 1; // safe fallback
}


// --------------------------------------------------------
// LOAD DATA (OBS + FORECAST) — CORRECT GEOJSON + MAPPED PERIODS
// --------------------------------------------------------
async function loadCalgaryAQHI() {

  const [obs, fc] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.geojson")
      .then(r => r.json()),

    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.geojson")
      .then(r => r.json())
  ]);

  const obsFeats = obs.features || [];
  const fcFeats  = fc.features  || [];

  // ---- HELPER: pick correct period from labels ----
  function pickPeriodIndexByCategory(p, category){
    const labels = [];
    for (let i=1;i<=5;i++){
      labels.push(((p[`p${i}_label`] || "") + "").toLowerCase());
    }
    const has = (i, s) => labels[i-1].includes(s);

    const isToday = i =>
      has(i,"today") ||
      has(i,"this morning") ||
      has(i,"this afternoon") ||
      (has(i,"this evening") && !has(i,"tonight"));

    const isTonight = i =>
      has(i,"tonight") || has(i,"overnight") || has(i,"this night");

    const isTomorrow = i =>
      (has(i,"tomorrow") && !has(i,"night")) ||
      has(i,"tomorrow daytime") ||
      has(i,"tomorrow afternoon") ||
      has(i,"tomorrow morning");

    let test;
    if (category === "today") test = isToday;
    if (category === "tonight") test = isTonight;
    if (category === "tomorrow") test = isTomorrow;

    if (test){
      for (let i=1;i<=5;i++){
        if (test(i)) return i;
      }
    }

    // fallback if labels are weird
    const fallback = { today:1, tonight:2, tomorrow:3 };
    return fallback[category] || 1;
  }

  // ---- FILTER CALGARY ----
  const obsCal = obsFeats
    .map(f => f.properties)
    .filter(p => /calgary/i.test(p.name));

  const fcCal = fcFeats
    .map(f => f.properties)
    .filter(p => /calgary/i.test(p.name));

  // ---- SORT newest first ----
  obsCal.sort((a,b) =>
    new Date(b.observed || b.observation_datetime) -
    new Date(a.observed || a.observation_datetime)
  );

  fcCal.sort((a,b) =>
    new Date(b.forecast_datetime) -
    new Date(a.forecast_datetime)
  );

  // ---- STORE CURRENT ----
  calgaryAQHI.current = obsCal.length ? {
    station: obsCal[0].name,
    value: Math.round(Number(obsCal[0].aqhi)),
    time: obsCal[0].observed || obsCal[0].observation_datetime
  } : null;

  // ---- STORE FORECAST (MAPPED BY LABELS) ----
  if (fcCal.length) {
    const p = fcCal[0];   // newest Calgary forecast

    const iToday   = pickPeriodIndexByCategory(p, "today");
    const iTonight = pickPeriodIndexByCategory(p, "tonight");
    const iTomorrow= pickPeriodIndexByCategory(p, "tomorrow");

    calgaryAQHI.forecast = {
      today:   Math.round(Number(p[`p${iToday}_aqhi`])),
      tonight:  Math.round(Number(p[`p${iTonight}_aqhi`])),
      tomorrow: Math.round(Number(p[`p${iTomorrow}_aqhi`])),
      raw: p   // keep raw properties for debugging
    };

  } else {
    calgaryAQHI.forecast = null;
  }

  console.log("Calgary AQHI loaded (GeoJSON):", calgaryAQHI);
}


// --------------------------------------------------------
// DRAW PANEL — FIXED TO MATCH NEW FORECAST STRUCTURE
// --------------------------------------------------------

function drawCalgaryPanel() {

  if (!calgaryAQHI.current) return;

  const v0 = calgaryAQHI.current.value;
  const p  = calgaryAQHI.forecast;

  const todayIdx = p ? pickPeriodIndexByCategory(p,"today") : 1;
  const tonightIdx = p ? pickPeriodIndexByCategory(p,"tonight") : 1;
  const tomorrowIdx = p ? pickPeriodIndexByCategory(p,"tomorrow") : 1;

  const fToday    = p ? Math.round(Number(p[`p${todayIdx}_aqhi`])) : null;
  const fTonight  = p ? Math.round(Number(p[`p${tonightIdx}_aqhi`])) : null;
  const fTomorrow = p ? Math.round(Number(p[`p${tomorrowIdx}_aqhi`])) : null;

  const html = `
  <div id="calgary-panel" style="
      position: fixed;
      top: 15px;
      right: 15px;
      background: white;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #999;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      max-width: 340px;
      font-family: Arial;
      z-index: 9999;
  ">

  <div style="font-size:16px; font-weight:700;">
    Calgary Air Quality (AQHI)
  </div>

  <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; margin-top:10px;">

    <div style="text-align:center;">
      <div style="background:${getColor(v0)}; width:60px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${v0}
      </div>
      <div style="font-size:12px;">Current</div>
    </div>

    <div style="text-align:center;">
      <div style="background:${getColor(fToday)}; width:60px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${fToday ?? "–"}
      </div>
      <div style="font-size:12px;">Today</div>
    </div>

    <div style="text-align:center;">
      <div style="background:${getColor(fTonight)}; width:60px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${fTonight ?? "–"}
      </div>
      <div style="font-size:12px;">Tonight</div>
    </div>

    <div style="text-align:center;">
      <div style="background:${getColor(fTomorrow)}; width:60px; height:40px;
           margin:auto; display:flex; align-items:center; justify-content:center;
           font-weight:bold; border:1px solid #333;">
        ${fTomorrow ?? "–"}
      </div>
      <div style="font-size:12px;">Tomorrow</div>
    </div>

  </div>

  <!-- ===== STACKED MINI-WEATHER (INSIDE PANEL) ===== -->
  <div style="margin-top:12px; font-weight:700;">
    Local weather (next 6 hours)
  </div>

  <div id="mini-weather"
       style="margin-top:6px;
              background:#f7f7f7;
              padding:8px;
              border-radius:6px;
              border:1px solid #ddd;
              font-size:12px;">
  </div>

  <!-- ===== LINKS YOU WANTED BACK ===== -->
  <div style="margin-top:12px; font-size:12px;">
    <div style="font-weight:700;">Wildfire & Smoke</div>
    <a href="https://firesmoke.ca/forecasts/current/" target="_blank">
      FireSmoke Canada — Current Forecast
    </a><br>
    <a href="https://eer.cmc.ec.gc.ca/mandats/AutoSim/ops/Fire_CA_HRDPS_CWFIS/latest/Canada/latest/img/Canada/anim.html"
       target="_blank">
      ECCC Fire & Smoke (HRDPS animation)
    </a>
  </div>

  <div style="margin-top:8px; font-size:12px;">
    <div style="font-weight:700;">Block Heater / Venue</div>
    <a href="https://dkevinm.github.io/AQ_Block_Heater/" target="_blank">
      AQ Block Heater Map
    </a>
  </div>

  </div>
  `;

  document.getElementById("calgary-panel")?.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}



// --------------------------------------------------------
// AUTO-RUN
// --------------------------------------------------------
loadCalgaryAQHI()
  .then(drawCalgaryPanel)
  .catch(err => console.error("Calgary AQHI failed:", err));

window.refreshCalgaryPanel = async function() {
  await loadCalgaryAQHI();
  drawCalgaryPanel();
};

console.log("Calgary module ready.");
