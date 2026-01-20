let calgaryAQHI = { current: null, forecast: null };

function safeRound(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function pickPeriodIndexByCategory(p, category) {
  const labels = [];
  for (let i = 1; i <= 5; i++) labels.push(((p[`p${i}_label`] || "") + "").toLowerCase());
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

async function loadCalgaryAQHI() {
  const [obs, fc] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.geojson").then(r => r.json()),
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.geojson").then(r => r.json())
  ]);

  const obsCal = (obs.features || []).map(f => f.properties).filter(p => /calgary/i.test(p.name));
  const fcCal  = (fc.features  || []).map(f => f.properties).filter(p => /calgary/i.test(p.name));

  obsCal.sort((a,b) => new Date(b.observed || b.observation_datetime) - new Date(a.observed || a.observation_datetime));
  fcCal.sort((a,b) => new Date(b.forecast_datetime) - new Date(a.forecast_datetime));

  calgaryAQHI.current = obsCal.length ? {
    station: obsCal[0].name,
    value: safeRound(obsCal[0].aqhi),
    time: obsCal[0].observed || obsCal[0].observation_datetime
  } : null;

  calgaryAQHI.forecast = fcCal.length ? fcCal[0] : null;

  console.log("Calgary AQHI loaded:", calgaryAQHI);
}

function drawCalgaryPanel() {
  if (!calgaryAQHI.current) return;

  const v0 = calgaryAQHI.current.value;
  const p = calgaryAQHI.forecast;

  const todayIdx    = p ? pickPeriodIndexByCategory(p, "today") : 1;
  const tonightIdx  = p ? pickPeriodIndexByCategory(p, "tonight") : 2;
  const tomorrowIdx = p ? pickPeriodIndexByCategory(p, "tomorrow") : 3;

  const fToday    = p ? safeRound(p[`p${todayIdx}_aqhi`]) : null;
  const fTonight  = p ? safeRound(p[`p${tonightIdx}_aqhi`]) : null;
  const fTomorrow = p ? safeRound(p[`p${tomorrowIdx}_aqhi`]) : null;

  const labToday    = p ? (p[`p${todayIdx}_label`]    || "Today")    : "Today";
  const labTonight  = p ? (p[`p${tonightIdx}_label`]  || "Tonight")  : "Tonight";
  const labTomorrow = p ? (p[`p${tomorrowIdx}_label`] || "Tomorrow") : "Tomorrow";

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
    <div style="font-size:16px; font-weight:700;">Calgary Air Quality (AQHI)</div>

    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; margin-top:10px;">
      <div style="text-align:center;">
        <div style="background:${getColor(v0)}; width:70px; height:40px; margin:auto;
             display:flex; align-items:center; justify-content:center; font-weight:bold; border:1px solid #333;">
          ${v0 ?? "–"}
        </div>
        <div style="font-size:12px;">Current</div>
      </div>

      <div style="text-align:center;">
        <div style="background:${getColor(fToday)}; width:70px; height:40px; margin:auto;
             display:flex; align-items:center; justify-content:center; font-weight:bold; border:1px solid #333;">
          ${fToday ?? "–"}
        </div>
        <div style="font-size:11px;">${labToday}</div>
      </div>

      <div style="text-align:center;">
        <div style="background:${getColor(fTonight)}; width:70px; height:40px; margin:auto;
             display:flex; align-items:center; justify-content:center; font-weight:bold; border:1px solid #333;">
          ${fTonight ?? "–"}
        </div>
        <div style="font-size:11px;">${labTonight}</div>
      </div>

      <div style="text-align:center;">
        <div style="background:${getColor(fTomorrow)}; width:70px; height:40px; margin:auto;
             display:flex; align-items:center; justify-content:center; font-weight:bold; border:1px solid #333;">
          ${fTomorrow ?? "–"}
        </div>
        <div style="font-size:11px;">${labTomorrow}</div>
      </div>
    </div>

    <div style="margin-top:10px; font-weight:600;">Weather (next 6 hours)</div>
    <div id="mini-weather" style="margin-top:6px; border:1px solid #999; border-radius:6px; padding:8px;"></div>

    <div style="margin-top:10px;">
      <div style="font-weight:600;">Wildfire & Smoke</div>
      <a href="https://firesmoke.ca/forecasts/current/" target="_blank">FireSmoke Canada – Current Forecast</a><br>
      <a href="https://weather.gc.ca/firework/index_e.html" target="_blank">ECCC Wildfire Dashboard</a>
    </div>
  </div>
  `;

  document.getElementById("calgary-panel")?.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

loadCalgaryAQHI()
  .then(drawCalgaryPanel)
  .catch(err => console.error("Calgary AQHI failed:", err));

window.refreshCalgaryPanel = async function () {
  await loadCalgaryAQHI();
  drawCalgaryPanel();
};
