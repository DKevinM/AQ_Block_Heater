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
    d.station.toLowerCase().includes("calgary")
  );

  const fc = parse(fcTxt).filter(d =>
    d.station.toLowerCase().includes("calgary")
  );

  obs.sort((a,b)=>new Date(b.time)-new Date(a.time));
  fc.sort((a,b)=>new Date(a.time)-new Date(b.time));

  calgaryAQHI.current = obs[0];
  calgaryAQHI.forecast = fc.slice(0, 3);
}

function drawCalgaryPanel() {

  if (!calgaryAQHI.current) {
    console.warn("No Calgary AQHI found — panel not drawn.");
    return;
  }

  const loc = window.lastClickedLatLng || {
    lat: 51.045150,
    lng: -114.045313
  };

  const box = (v, label) => `
    <div class="aqhi-cell">
      <div class="aqhi-label">${label}</div>
      <div class="aqhi-box" style="background:${getColor(v)}">${v}</div>
    </div>
  `;

  const html = `
  <div id="calgary-panel">

    <div class="loc-line">
      📍 Clicked location: 
      ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}
    </div>

    <h2>Calgary Air Quality (AQHI)</h2>
    <div class="subtitle">
      Lower is better for outdoor activities
    </div>

    <div class="aqhi-grid">
      ${box(calgaryAQHI.current.value, "Current")}
      ${box(calgaryAQHI.forecast[0]?.value ?? "—", "Tonight")}
      ${box(calgaryAQHI.forecast[1]?.value ?? "—", "Evening")}
      ${box(calgaryAQHI.forecast[2]?.value ?? "—", "Tomorrow")}
    </div>

    <div class="forecast-title">Local forecast (next 6 hours)</div>
    <div id="mini-weather">
      <em>Click the map to load local weather…</em>
    </div>

  </div>
  `;

  const old = document.getElementById("calgary-panel");
  if (old) old.remove();

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
