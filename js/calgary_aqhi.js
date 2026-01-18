// ========================================================
// CALGARY AQHI PANEL — CLEAN WORKING VERSION
// ========================================================

let calgaryAQHI = {
  current: null,
  forecast: []
};

// --------------------------------------------------------
// LOAD DATA (BOTH OBSERVATIONS + FORECAST)
// --------------------------------------------------------
async function loadCalgaryAQHI() {
  const [obsTxt, fcTxt] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.csv")
      .then(r => r.text()),

    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.csv")
      .then(r => r.text())
  ]);

  const obs = parseObs(obsTxt).filter(d => /calgary/i.test(d.station));
  const fc  = parseFc(fcTxt).filter(d => /calgary/i.test(d.station));

  obs.sort((a,b)=>new Date(b.time)-new Date(a.time));
  fc.sort((a,b)=>new Date(a.time)-new Date(b.time));

  calgaryAQHI.current = obs[0];
  calgaryAQHI.forecast = fc[0];   // SINGLE ROW with p1/p2/p3
}

  // -------- Parse observations ----------
  const parseObs = txt =>
    txt.trim().split("\n").slice(1).map(r => {
      const cols = r.split(",");
      return {
        station: cols[1],          // Calgary
        value: Math.round(Number(cols[3])),   // ✅ FORCE INTEGER AQHI
        time: cols[4]
      };
    });
  
  const parseFc = txt =>
    txt.trim().split("\n").slice(1).map(r => {
      const cols = r.split(",");
      return {
        station: cols[1],
        p1: Math.round(Number(cols[9])),   // Tonight
        p2: Math.round(Number(cols[11])),  // Evening
        p3: Math.round(Number(cols[13])),  // Tomorrow
        time: cols[4]
      };
    });
  

  // -------- Filter Calgary ----------
  const obs = parseObs(obsTxt).filter(d =>
    /calgary/i.test(d.station)
  );

  const fc = parseFc(fcTxt).filter(d =>
    /calgary/i.test(d.station)
  );

  // -------- Sort to newest ----------
  obs.sort((a, b) => new Date(b.time) - new Date(a.time));

  // -------- Store results ----------
  calgaryAQHI.current = obs[0];

  if (fc.length > 0) {
    calgaryAQHI.forecast = [
      fc[0].p1,
      fc[0].p2,
      fc[0].p3
    ];
  }

  console.log("Calgary AQHI loaded:", calgaryAQHI);
}

// --------------------------------------------------------
// DRAW PANEL
// --------------------------------------------------------
function drawCalgaryPanel() {

  if (!calgaryAQHI.current) return;

  const v0 = calgaryAQHI.current.value;
  const f1 = calgaryAQHI.forecast?.p1;
  const f2 = calgaryAQHI.forecast?.p2;
  const f3 = calgaryAQHI.forecast?.p3;


  const clicked = window.lastClickedLatLng
    ? `${window.lastClickedLatLng.lat.toFixed(4)}, ${window.lastClickedLatLng.lng.toFixed(4)}`
    : "Click the map";

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

  <div style="font-weight:600;">Clicked location: ${clicked}</div>

  <hr>

  <div style="font-size:16px; font-weight:700;">
    Calgary Air Quality (AQHI)
  </div>

  <div style="font-size:12px; margin-top:4px;">
    Lower is better for outdoor activities
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


  <div id="mini-weather" class="info-small">
    Weather loads after you click the map.
  </div>


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
// AUTO-RUN ON LOAD
// --------------------------------------------------------
loadCalgaryAQHI()
  .then(drawCalgaryPanel)
  .catch(err => console.error("Calgary AQHI failed:", err));

// Allow refresh from main.js
window.refreshCalgaryPanel = async function() {
  await loadCalgaryAQHI();
  drawCalgaryPanel();
};

console.log("Calgary module ready.");
