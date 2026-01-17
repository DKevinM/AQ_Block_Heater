let hasClickedBefore = false;

map.on("click", async function (e) {
  const { lat, lng } = e.latlng;

  if (hasClickedBefore) clearMap();
  hasClickedBefore = true;

  await renderClickData(lat, lng, map);

  // Optional reverse geocode (same as your current one)
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    .then(r => r.json())
    .then(d => {
      L.popup()
        .setLatLng([lat, lng])
        .setContent(`<b>Address:</b><br>${d.display_name || "Unknown"}`)
        .openOn(map);
    });
});
