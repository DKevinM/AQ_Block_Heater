// ---------- BASE LAYER FIRST ----------
const openStreetMapLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

// ---------- SINGLE MAP ----------
const map = L.map('map', {
  layers: [openStreetMapLayer]
}).setView([51.045150, -114.045313], 15);

let hasClickedBefore = false;
window.lastClickedLatLng = null;

// ---------------- MAP CLICK (THIS WAS MISSING) ----------------
map.on("click", async function (e) {
  const { lat, lng } = e.latlng;

  // remember where the user clicked
  window.lastClickedLatLng = { lat, lng };

  // clear old markers after first click
  if (hasClickedBefore) clearMap();
  hasClickedBefore = true;

  // run your whole pipeline
  await renderClickData(lat, lng, map);
});

  if (window.refreshCalgaryPanel) {
    window.refreshCalgaryPanel();
  }


// ---------- ONE SET OF LAYER GROUPS ONLY ----------
const markerGroup = L.layerGroup().addTo(map);
window.markerGroup = markerGroup;

/* PurpleAir master layer (ONLY DEFINITION) */
window.paLayer = L.layerGroup().addTo(map);
const paLayer = window.paLayer;




// Track markers so we can clear them
let existingMarkers = [];
let stationMarkers = [];





window.updateMiniWeather = function(w) {

  const el = document.getElementById("mini-weather");
  if (!el) return;

  // ----- CURRENT CONDITIONS -----
  const timeNow = w.hourly.time[0].slice(11,16);      // HH:MM
  const t0  = Math.round(w.hourly.temperature_2m[0]);
  const ws0 = Math.round(w.hourly.wind_speed_10m[0]);
  const wd0 = Math.round(w.hourly.wind_direction_10m[0]);
  const uv0 = Math.round(w.hourly.uv_index[0]);
  const rain0 = w.hourly.rain[0].toFixed(1);

  // ----- WIND DIRECTION TEXT -----
  function windDirText(deg){
    const dirs = ["N","NE","E","SE","S","SW","W","NW","N"];
    return dirs[Math.round(deg/45)];
  }

  // ----- BUILD 6-HOUR FORECAST TABLE -----
  let forecastRows = "";

  for (let i = 1; i <= 6; i++) {
    const time = w.hourly.time[i].slice(11,16); // HH:MM
    const temp = Math.round(w.hourly.temperature_2m[i]);
    const wind = Math.round(w.hourly.wind_speed_10m[i]);
    const wdir = Math.round(w.hourly.wind_direction_10m[i]);
    const rain = w.hourly.rain[i].toFixed(1);

    forecastRows += `
      <tr>
        <td>${time}</td>
        <td>${temp}°C</td>
        <td>${wind} km/h</td>
        <td>${windDirText(wdir)}</td>
        <td>${rain} mm</td>
      </tr>
    `;
  }

  // ----- FINAL MINI-WEATHER HTML -----
  el.innerHTML = `
  <div style="font-weight:700; margin-bottom:6px;">Local Weather</div>

  <div style="font-size:12px; margin-bottom:6px;">
    <b>${timeNow}</b><br>
    Temp: ${t0}°C<br>
    Wind: ${ws0} km/h ${windDirText(wd0)}<br>
    Rain: ${rain0} mm<br>
    UV: ${uv0}
  </div>

  <table style="width:100%; font-size:11px; border-collapse: collapse;">
    <thead>
      <tr style="border-bottom:1px solid #aaa;">
        <th>Time</th>
        <th>Temp</th>
        <th>Wind</th>
        <th>Dir</th>
        <th>Rain</th>
      </tr>
    </thead>
    <tbody>
      ${forecastRows}
    </tbody>
  </table>
  `;
};








// ---------------- CLEAR MAP ----------------
function clearMap() {
  const allMarkers = existingMarkers
    .concat(stationMarkers);

  allMarkers.forEach(m => map.removeLayer(m));

  existingMarkers = [];
  stationMarkers = [];

}



const baseLayers = {
  "Streets": openStreetMapLayer,
  "Satellite": L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, attribution: 'Tiles © Esri' }
  )
};



const layerRegistry = {};

const overlayOrder = [
  "Stations",
  "Sensors (PurpleAir)",
  "Radar",
  "Wind (U-component)",
  "Lightning",
  "Thunderstorm (3h)"
];


layerRegistry["Stations"] = markerGroup;
layerRegistry["Sensors (PurpleAir)"] = paLayer;

const weatherLayers = {
  "Radar": L.tileLayer.wms("https://geo.weather.gc.ca/geomet/?lang=en", {
    layers: "RADAR_1KM_RRAI",
    format: "image/png",
    transparent: true,
    opacity: 0.85
  }),

  "Wind (U-component)": L.tileLayer.wms("https://geo.weather.gc.ca/geomet/?lang=en", {
    layers: "HRDPS.CONTINENTAL_UU",
    format: "image/png",
    transparent: true,
    opacity: 0.7
  }),

  "Lightning": L.tileLayer.wms("https://geo.weather.gc.ca/geomet", {
    layers: "Lightning_2.5km_Density",
    format: "image/png",
    transparent: true,
    opacity: 0.85
  }),

  "Thunderstorm (3h)": L.tileLayer.wms("https://geo.weather.gc.ca/geomet", {
    layers: "GDPS-WEonG_15km_Thunderstorm-Prob.3h",
    format: "image/png",
    transparent: true,
    opacity: 0.75
  })
};

// register weather layers
Object.entries(weatherLayers).forEach(([name, layer]) => {
  layerRegistry[name] = layer;
});

let overlayLayers = {};
overlayOrder.forEach(name => {
  if (layerRegistry[name]) {
    overlayLayers[name] = layerRegistry[name];
  }
});


const layerControl = L.control.layers(baseLayers, overlayLayers, {
  collapsed: false
}).addTo(map);

// ---------- LEGEND ----------
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  const grades = ["1","2","3","4","5","6","7","8","9","10","10+"];
  grades.forEach(g => {
    div.innerHTML += `<i style="background:${getColor(g)}"></i> ${g}<br>`;
  });
  return div;
};
legend.addTo(map);

// ---------- LOGO ----------
const logo = L.control({ position: 'bottomright' });
logo.onAdd = function () {
  const div = L.DomUtil.create('div', 'logo-container');
  div.innerHTML = `<img src="ACA_LOGO_CMYK.png" alt="Logo">`;
  return div;
};
logo.addTo(map);

// ---------- AUTO REFRESH ----------
setInterval(() => location.reload(), 60 * 60 * 1000);


function getColor(aqhi) {
  const v = parseInt(aqhi);
  if (!isFinite(v) || v < 1) return "#D3D3D3";
  if (v >= 11) return "#640100";

  const lut = {
    1:"#01cbff",2:"#0099cb",3:"#016797",
    4:"#fffe03",5:"#ffcb00",6:"#ff9835",
    7:"#fd6866",8:"#fe0002",9:"#cc0001",10:"#9a0100"
  };
  return lut[v] || "#D3D3D3";
}

function style(feature) {
  const v = feature.properties?.value;
  return {
    fillColor: getColor(v),
    weight: 0.5,
    opacity: 0.6,
    color: 'white',
    fillOpacity: 0.7
  };
}



// =========================================================
// THIS BELONGS IN: main.js  (AT THE VERY BOTTOM)
// =========================================================

async function renderClickData(lat, lng, map) {

  // ----- 1) MARK CLICK LOCATION -----
  const marker = L.marker([lat, lng]);
  markerGroup.addLayer(marker);
  existingMarkers.push(marker);

  marker.bindTooltip(
    `Your location<br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
    { sticky: true, direction: "top", opacity: 0.9 }
  ).openTooltip();

  // ==================================================
  // 2) NEAREST AQHI STATION
  // ==================================================
  if (!window.dataByStation) {
    console.error("dataByStation is missing — cannot find nearest station.");
  } else {

    const closestStation = Object.values(dataByStation)
      .map(arr => {
        const aqhiObj = arr.find(d => d.ParameterName === "AQHI");
        return aqhiObj || arr[0];
      })
      .map(r => ({
        ...r,
        dist_km: (getDistance(lat, lng, r.Latitude, r.Longitude) / 1000).toFixed(1)
      }))
      .sort((a, b) => a.dist_km - b.dist_km)[0];

    const stationColor = getColor(closestStation.Value);

    const stationCircle = L.circleMarker(
      [closestStation.Latitude, closestStation.Longitude],
      {
        radius: 15,
        color: "#000",
        fillColor: stationColor,
        weight: 3,
        fillOpacity: 0.8
      }
    );

    markerGroup.addLayer(stationCircle);
    stationMarkers.push(stationCircle);

    const stationPopup = `
      <strong>Nearest AQHI Station</strong><br>
      ${closestStation.StationName}<br>
      Distance: ${closestStation.dist_km} km<br>
      AQHI: ${closestStation.Value}
    `;

    stationCircle.bindPopup(stationPopup);
  }

  // ==================================================
  // 3) LOCAL WEATHER  — THIS IS THE SINGLE SOURCE OF TRUTH
  // ==================================================
  try {
    const wresp = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,` +
      `snowfall,cloudcover,uv_index,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,weathercode&timezone=America%2FEdmonton`
    );

    const wdata = await wresp.json();

    // ---- BIG PANEL (your working weather table) ----
    if (typeof showWeather === "function") {
      showWeather(wdata);
    }

    // ---- CALGARY MINI PANEL ----
    if (window.updateMiniWeather) {
      window.updateMiniWeather(wdata);
    }

  } catch (err) {
    console.error("Weather error:", err);
  }

  // ==================================================
  // 4) NEAREST PURPLEAIR
  // ==================================================
  if (typeof showPurpleAir === "function") {
    showPurpleAir(lat, lng);
  }
}
