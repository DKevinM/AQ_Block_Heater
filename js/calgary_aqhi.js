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


const parse = txt =>
  txt.trim().split("\n").slice(1).map(r => {
    const cols = r.split(",");

    return {
      station: cols[1],          // Calgary is column 1
      value: Number(cols[3]),   // AQHI is column 3
      time: cols[4]             // ISO time is column 4
    };
  });



  const obs = parse(obsTxt).filter(d =>
    /calgary/i.test(d.station)
  );
  
  const fc = parse(fcTxt).filter(d =>
    /calgary/i.test(d.station)
  );


  
  obs.sort((a,b)=>new Date(b.time)-new Date(a.time));
  fc.sort((a,b)=>new Date(a.time)-new Date(b.time));

  calgaryAQHI.current = obs[0];
  calgaryAQHI.forecast = fc.slice(0, 3);
}



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
  
      <div class="info-label" style="margin-top:8px;">📍 Clicked location:</div>
      <div style="margin-bottom:6px;">${clicked}</div>
  
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

