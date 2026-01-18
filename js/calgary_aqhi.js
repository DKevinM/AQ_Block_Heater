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



  const normalize = s => 
    String(s || "").trim().toLowerCase();
  
  const obs = parse(obsTxt).filter(d =>
    normalize(d.station).includes("calgary")
  );
  
  const fc = parse(fcTxt).filter(d =>
    normalize(d.station).includes("calgary")
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
      <div class="title">Calgary AQHI</div>
  
      <div style="font-size: 0.85em; margin-bottom: 6px;">
          ${
            window.lastClickedLatLng
              ? window.lastClickedLatLng.lat.toFixed(4) +
                ", " +
                window.lastClickedLatLng.lng.toFixed(4)
              : "Click the map"
          }
        </span>
      </div>
  
      <div class="row">
        ${box(calgaryAQHI.current.value)}
        ${calgaryAQHI.forecast.map(f => box(f.value)).join("")}
      </div>
  
      <hr>
  
      <div style="font-size: 0.85em;">
        <strong>Local forecast (next hour)</strong><br>
        <div id="mini-weather">
          Click the map for weather…
        </div>
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
