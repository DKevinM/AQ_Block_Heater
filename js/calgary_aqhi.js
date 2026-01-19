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
// LOAD DATA (OBS + FORECAST) — CORRECT GEOJSON
// --------------------------------------------------------
async function loadCalgaryAQHI() {

  const [obs, fc] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.geojson")
      .then(r => r.json()),

    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.geojson")
      .then(r => r.json())
  ]);

  // Extract features
  const obsFeats = obs.features || [];
  const fcFeats  = fc.features  || [];

  // Filter Calgary
  const obsCal = obsFeats
    .map(f => f.properties)
    .filter(p => /calgary/i.test(p.name));

  const fcCal = fcFeats
    .map(f => f.properties)
    .filter(p => /calgary/i.test(p.name));

  // Sort newest first
  obsCal.sort((a,b) =>
    new Date(b.observed || b.observation_datetime) -
    new Date(a.observed || a.observation_datetime)
  );

  fcCal.sort((a,b) =>
    new Date(b.forecast_datetime) -
    new Date(a.forecast_datetime)
  );

  // Store current
  calgaryAQHI.current = obsCal.length ? {
    station: obsCal[0].name,
    value: Math.round(Number(obsCal[0].aqhi)),
    time: obsCal[0].observed || obsCal[0].observation_datetime
  } : null;

  // Store FULL forecast properties (critical)
  calgaryAQHI.forecast = fcCal.length ? fcCal[0] : null;

  console.log("Calgary AQHI loaded (GeoJSON):", calgaryAQHI);
}

// --------------------------------------------------------
// DRAW PANEL — NO ICONS, CLEAN LAYOUT
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

  <div id="mini-weather"
       style="position: fixed;
              bottom: 15px;
              left: 15px;
              background: white;
              padding: 8px;
              border-radius: 6px;
              border: 1px solid #999;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              font-size: 12px;
              max-width: 220px;
              z-index: 9999;">
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
