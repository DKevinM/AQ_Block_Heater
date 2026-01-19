// ========================================================
// CALGARY AQHI PANEL — CLEAN WORKING VERSION (FIXED)
// ========================================================

let calgaryAQHI = {
  current: null,   // { station, value, time }
  forecast: null   // { p1, p2, p3, time }
};

// --------------------------------------------------------
// SHARED PARSERS (DEFINED ONCE — OUTSIDE FUNCTION)
// --------------------------------------------------------
const parseObs = txt =>
  txt.trim().split("\n").slice(1).map(r => {
    const cols = r.split(",");
    return {
      station: cols[1],
      value: Math.round(Number(cols[3])), // FORCE INTEGER
      time: cols[4]
    };
  });

const parseFc = txt =>
  txt.trim().split("\n").slice(1).map(r => {
    const cols = r.split(",");
    return {
      station: cols[1],
      p1: Math.round(Number(cols[9])),
      p2: Math.round(Number(cols[11])),
      p3: Math.round(Number(cols[13])),
      time: cols[4]
    };
  });

// --------------------------------------------------------
// LOAD DATA (OBS + FORECAST)
// --------------------------------------------------------

async function loadCalgaryAQHI() {

  const [obsGeo, fcGeo] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.geojson")
      .then(r => r.json()),

    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.geojson")
      .then(r => r.json())
  ]);

  // --- Extract features ---
  const obs = obsGeo.features.map(f => f.properties);
  const fc  = fcGeo.features.map(f => f.properties);

  // ---- FILTER CALGARY (case-insensitive) ----
  const obsCal = obs.filter(d => /calgary/i.test(d.name || d.station));
  const fcCal  = fc.filter(d => /calgary/i.test(d.name || d.station));

  // newest first
  obsCal.sort((a,b) =>
    new Date(b.time || b.forecast_datetime) -
    new Date(a.time || a.forecast_datetime)
  );

  fcCal.sort((a,b) =>
    new Date(b.forecast_datetime) -
    new Date(a.forecast_datetime)
  );

  // ---- STORE CURRENT (integer) ----
  calgaryAQHI.current = obsCal[0]
    ? {
        station: obsCal[0].name || obsCal[0].station,
        value: Math.round(Number(obsCal[0].aqhi || obsCal[0].value)),
        time: obsCal[0].time || obsCal[0].forecast_datetime
      }
    : null;

  // ---- STORE FORECAST (single row) ----
  if (fcCal.length > 0) {
    calgaryAQHI.forecast = {
      p1: Math.round(Number(fcCal[0].p1_aqhi ?? fcCal[0].p1)),
      p2: Math.round(Number(fcCal[0].p2_aqhi ?? fcCal[0].p2)),
      p3: Math.round(Number(fcCal[0].p3_aqhi ?? fcCal[0].p3))
    };
  } else {
    console.warn("No Calgary forecast found in GeoJSON");
    calgaryAQHI.forecast = { p1:null, p2:null, p3:null };
  }

  console.log("Calgary AQHI loaded (GEOJSON):", calgaryAQHI);
}


// --------------------------------------------------------
// DRAW PANEL (NO ICONS, NO JUNK TEXT)
// --------------------------------------------------------
function drawCalgaryPanel() {

  if (!calgaryAQHI.current) return;

  const v0 = calgaryAQHI.current.value;
  const f1 = calgaryAQHI.forecast?.p1;
  const f2 = calgaryAQHI.forecast?.p2;
  const f3 = calgaryAQHI.forecast?.p3;

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

  <div style="
      display:grid;
      grid-template-columns: repeat(4, 1fr);
      gap:6px;
      margin-top:10px;
  ">

    <div style="text-align:center;">
      <div style="
           background:${getColor(v0)};
           width:60px;
           height:40px;
           margin:auto;
           display:flex;
           align-items:center;
           justify-content:center;
           color:black;
           font-weight:bold;
           border:1px solid #333;">
        ${v0}
      </div>
      <div style="font-size:12px;">Current</div>
    </div>

    <div style="text-align:center;">
      <div style="
           background:${getColor(f1)};
           width:60px;
           height:40px;
           margin:auto;
           display:flex;
           align-items:center;
           justify-content:center;
           color:black;
           font-weight:bold;
           border:1px solid #333;">
        ${f1 ?? "–"}
      </div>
      <div style="font-size:12px;">Tonight</div>
    </div>

    <div style="text-align:center;">
      <div style="
           background:${getColor(f2)};
           width:60px;
           height:40px;
           margin:auto;
           display:flex;
           align-items:center;
           justify-content:center;
           color:black;
           font-weight:bold;
           border:1px solid #333;">
        ${f2 ?? "–"}
      </div>
      <div style="font-size:12px;">Evening</div>
    </div>

    <div style="text-align:center;">
      <div style="
           background:${getColor(f3)};
           width:60px;
           height:40px;
           margin:auto;
           display:flex;
           align-items:center;
           justify-content:center;
           color:black;
           font-weight:bold;
           border:1px solid #333;">
        ${f3 ?? "–"}
      </div>
      <div style="font-size:12px;">Tomorrow</div>
    </div>

  </div>

  <div style="margin-top:10px; font-weight:600;">
    Local forecast (next hour)
  </div>


  <div id="mini-weather" style="
     position: fixed;
     bottom: 15px;
     left: 15px;
     background: white;
     padding: 8px;
     border-radius: 6px;
     border: 1px solid #999;
     box-shadow: 0 2px 6px rgba(0,0,0,0.2);
     font-size: 12px;
     max-width: 220px;
     z-index: 9999;
  "></div>
    

  <div style="margin-top:10px;">
    <div style="font-weight:600;">External Resources</div>
    <a href="https://firesmoke.ca/forecasts/current/" target="_blank">
      FireSmoke Canada – Current Forecast
    </a><br>
    <a href="https://eer.cmc.ec.gc.ca/mandats/AutoSim/ops/Fire_CA_HRDPS_CWFIS/latest/Canada/latest/img/Canada/anim.html"
       target="_blank">
      ECCC Fire & Smoke HRDPS Animation
    </a>
  </div>

  </div>
  `;

  document.getElementById("calgary-panel")?.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

// --------------------------------------------------------
// AUTO RUN
// --------------------------------------------------------
loadCalgaryAQHI()
  .then(drawCalgaryPanel)
  .catch(err => console.error("Calgary AQHI failed:", err));

window.refreshCalgaryPanel = async function() {
  await loadCalgaryAQHI();
  drawCalgaryPanel();
};

console.log("Calgary module ready.");
