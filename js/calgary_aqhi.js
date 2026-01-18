let calgaryAQHI = {
  current: null,
  forecast: []
};


// USE the global getColor from main.js
// (do NOT redefine it here)


async function loadCalgaryAQHI() {

  const [obsTxt, fcTxt] = await Promise.all([
    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_observations.csv")
      .then(r => r.text()),

    fetch("https://raw.githubusercontent.com/DKevinM/CAN_AQHI/main/data/aqhi_forecasts.csv")
      .then(r => r.text())
  ]);

  // ---------- PARSE OBSERVATIONS (same idea as before) ----------
  const parseObs = txt =>
    txt.trim().split("\n").slice(1).map(r => {
      const c = r.split(",");
      return {
        station: c[1],
        value: Number(c[3]),
        time: c[4]
      };
    });

  const obs = parseObs(obsTxt)
    .filter(d => /calgary/i.test(d.station))
    .sort((a,b) => new Date(b.time) - new Date(a.time));

  calgaryAQHI.current = obs[0];   // latest observed AQHI


  // ---------- PARSE FORECAST (THIS IS THE KEY FIX) ----------
  const fcLines = fcTxt.trim().split("\n");
  const header = fcLines.shift().split(",");
  
  // find the SINGLE Calgary row
  const calgaryRow = fcLines
    .map(r => r.split(","))
    .find(cols => /calgary/i.test(cols[1]));   // column 1 = city name
  
  if (!calgaryRow) {
    console.warn("No Calgary row found in forecast file");
    calgaryAQHI.forecast = [];
    return;
  }
  
  // find the AQHI columns dynamically
  const i_p1 = header.indexOf("p1_aqhi");
  const i_p2 = header.indexOf("p2_aqhi");
  const i_p3 = header.indexOf("p3_aqhi");
  
  // build the forecast array your panel expects
  calgaryAQHI.forecast = [
    { label: "Tonight",  value: Number(calgaryRow[i_p1]) },
    { label: "Evening",  value: Number(calgaryRow[i_p2]) },
    { label: "Tomorrow", value: Number(calgaryRow[i_p3]) }
  ];







  function drawCalgaryPanel() {
    if (!calgaryAQHI.current) return;
  
    const v0 = calgaryAQHI.current.value;
    const f1 = calgaryAQHI.forecast?.[0]?.value;
    const f2 = calgaryAQHI.forecast?.[1]?.value;
    const f3 = calgaryAQHI.forecast?.[2]?.value;
  
    const clicked = window.lastClickedLatLng
      ? `${window.lastClickedLatLng.lat.toFixed(4)}, ${window.lastClickedLatLng.lng.toFixed(4)}`
      : "Click the map";
  
    const html = `
    <div id="calgary-panel" style="max-width: 320px; font-family: Arial;">
    
      <div class="info-title">Calgary Air Quality (AQHI)</div>
  
      <div class="info-small" style="margin-top:6px;">
        Lower is better for outdoor activities
      </div>
  
  
      <!-- AQHI blocks -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; margin-top:8px;">
        
        <div style="text-align:center;">
          <div class="aqhi-color-box"
               style="background:${getColor(v0)}; width:60px; height:40px; margin:auto;">
            ${v0}
          </div>
          <div class="info-small">Current</div>
        </div>
  
        <div style="text-align:center;">
          <div class="aqhi-color-box"
               style="background:${getColor(f1)}; width:60px; height:40px; margin:auto;">
            ${f1 ?? "–"}
          </div>
          <div class="info-small">Tonight</div>
        </div>
  
        <div style="text-align:center;">
          <div class="aqhi-color-box"
               style="background:${getColor(f2)}; width:60px; height:40px; margin:auto;">
            ${f2 ?? "–"}
          </div>
          <div class="info-small">Evening</div>
        </div>
  
        <div style="text-align:center;">
          <div class="aqhi-color-box"
               style="background:${getColor(f3)}; width:60px; height:40px; margin:auto;">
            ${f3 ?? "–"}
          </div>
          <div class="info-small">Tomorrow</div>
        </div>
  
      </div>
  
      <div class="info-label" style="margin-top:10px;">Local forecast (next hour)</div>
      <div id="mini-weather" class="info-small">
        Click the map for weather…
      </div>
  
      <div class="resource-links" style="margin-top:10px;">
        <div class="info-label">External Resources</div>
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
  
    // Remove old panel if it exists, then add new one
    document.getElementById("calgary-panel")?.remove();
    document.body.insertAdjacentHTML("beforeend", html);
  }



// Run immediately once the file loads
loadCalgaryAQHI()
  .then(drawCalgaryPanel)
  .catch(err => console.error("Calgary AQHI failed:", err));





console.log("👉 Calgary file LOADED");

loadCalgaryAQHI()
  .then(() => {
    console.log("👉 Calgary DATA loaded:", calgaryAQHI);
    drawCalgaryPanel();
  })
  .catch(err => console.error("❌ Calgary AQHI failed:", err));

  
  window.refreshCalgaryPanel = async function() {
    await loadCalgaryAQHI();
    drawCalgaryPanel();
  };

