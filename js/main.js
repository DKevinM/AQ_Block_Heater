// ---------------- MAP SETUP ----------------
const openStreetMapLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

const map = L.map('map', {
  layers: [openStreetMapLayer]
}).setView([51.045150, -114.045313], 11);

L.control.layers({
  "OpenStreetMap": openStreetMapLayer
}).addTo(map);

// Track markers so we can clear them
let existingMarkers = [];
let stationMarkers = [];

// ---------------- CLEAR MAP ----------------
function clearMap() {
  const allMarkers = existingMarkers
    .concat(stationMarkers, window.purpleAirMarkers || []);

  allMarkers.forEach(m => map.removeLayer(m));

  existingMarkers = [];
  stationMarkers = [];
  window.purpleAirMarkers = [];
}

// ---------------- MAP CLICK ----------------
let hasClickedBefore = false;

map.on("click", async function (e) {
  const { lat, lng } = e.latlng;

  if (hasClickedBefore) clearMap();
  hasClickedBefore = true;

  await renderClickData(lat, lng, map);
});
