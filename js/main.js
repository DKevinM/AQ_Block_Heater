// ---------- BASE LAYER FIRST ----------
const openStreetMapLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

// ---------- SINGLE MAP ----------
const map = L.map('map', {
  layers: [openStreetMapLayer]
}).setView([51.045150, -114.045313], 14);

// ---------- ONE SET OF LAYER GROUPS ONLY ----------
const markerGroup = L.layerGroup().addTo(map);
const paLayer = L.layerGroup().addTo(map);
window.purpleAirMarkers = [];


// Track markers so we can clear them
let existingMarkers = [];
let stationMarkers = [];



window.lastClickedLatLng = null;

map.on("click", async function (e) {
  const { lat, lng } = e.latlng;
  window.lastClickedLatLng = { lat, lng };

  if (hasClickedBefore) clearMap();
  hasClickedBefore = true;

  await renderClickData(lat, lng, map);
});



// ---------------- CLEAR MAP ----------------
function clearMap() {
  const allMarkers = existingMarkers
    .concat(stationMarkers, window.purpleAirMarkers || []);

  allMarkers.forEach(m => map.removeLayer(m));

  existingMarkers = [];
  stationMarkers = [];
  window.purpleAirMarkers = [];
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

