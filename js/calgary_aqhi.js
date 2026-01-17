let calgaryAQHI = {
  current: null,
  forecast: []
};

function getColor(aqhi) {
  if (aqhi == null || isNaN(aqhi)) return "#808080";

  if (aqhi >= 10) return "#9a0100";
  if (aqhi >= 9)  return "#cc0001";
  if (aqhi >= 8)  return "#fe0002";
  if (aqhi >= 7)  return "#fd6866";
  if (aqhi >= 6)  return "#ff9835";
  if (aqhi >= 5)  return "#ffcb00";
  if (aqhi >= 4)  return "#fffe03";
  if (aqhi >= 3)  return "#016797";
  if (aqhi >= 2)  return "#0099cb";
  return "#01cbff";
}


async function loadCalgaryAQHI() {
  const [obsTxt, fcTxt] = await Promise.all([
    fetch("/CAN_AQHI/data/aqhi_observations.csv").then(r => r.text()),
    fetch("/CAN_AQHI/data/aqhi_forecasts.csv").then(r => r.text())
  ]);

  const parse = txt =>
    txt.trim().split("\n").slice(1).map(r => {
      const [station, time, value] = r.split(",");
      return { station, time, value: Number(value) };
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
  if (!calgaryAQHI.current) return;

  const box = v => `
    <div class="aqhi-box" style="background:${getColor(v)}">${v}</div>
  `;

  const html = `
    <div id="calgary-panel">
      <div class="title">Calgary AQHI</div>
      <div class="row">
        ${box(calgaryAQHI.current.value)}
        ${calgaryAQHI.forecast.map(f => box(f.value)).join("")}
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);
}


document.addEventListener("DOMContentLoaded", async () => {
  await loadCalgaryAQHI();
  drawCalgaryPanel();
});
