const MAPTILER_KEY = "gS7ofDEf4nPilvq172k8"; 
const OPEN_WEATHER_KEY = "34f7ef4d6bb319bf0e18c03de756b40a";

const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/019e040c-ff22-7517-a2ef-d5507450dd40/style.json?key=${MAPTILER_KEY}`,
  center: [-123.1207, 49.2827], 
  zoom: 11,
});

map.addControl(new maplibregl.NavigationControl());

// Toggling the views
let currentView = "regular";

function switchView(view) {
  currentView = view;
  document.getElementById("btn-regular").classList.toggle("active", view === "regular");
  document.getElementById("btn-climate").classList.toggle("active", view === "climate");

  if (view === "regular") {
    showRegularView();
  } else {
    showClimateView();
  }
}

// Regular view
function showRegularView() {
  if (map.getLayer("climate-layer")) {
    map.setLayoutProperty("climate-layer", "visibility", "none");
  }
}

// Microclimate view
function showClimateView() {
  map.once("idle", () => {

    if (!map.getSource("climate-overlay")) {

      map.addSource("climate-overlay", {
        type: "raster",
        tiles: [
   
          `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPEN_WEATHER_KEY}`
        ],
        tileSize: 256,
      });

      map.addLayer({
        id: "climate-layer",
        type: "raster",
        source: "climate-overlay",
        paint: {
          "raster-opacity": 0.6,
        },
      });

    } else {
      map.setLayoutProperty("climate-layer", "visibility", "visible");
    }

  });
}

// Start it
map.on("load", () => {
  showRegularView();
});