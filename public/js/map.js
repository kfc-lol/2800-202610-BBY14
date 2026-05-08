const MAPTILER_KEY = process.env.MAPTILER_KEY;

const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/019e040c-ff22-7517-a2ef-d5507450dd40/style.json?key=${MAPTILER_KEY}`,
  center: [-123.1207, 49.2827], 
  zoom: 11,
});

map.addControl(new maplibregl.NavigationControl());

// Tracks which view the user is currently on
let currentView = "regular";

function switchView(view) {
  currentView = view;

  // Toggles the "active" CSS class on whichever button was clicked
  document.getElementById("btn-regular").classList.toggle("active", view === "regular");
  document.getElementById("btn-zones").classList.toggle("active", view === "zones");

  if (view === "regular") {
    showRegularView();
  } else {
    showZonesView();
  }
}

// Regular map view
function showRegularView() {
  if (map.getLayer("zones-fill")) {
    map.setLayoutProperty("zones-fill", "visibility", "none");
  }
  if (map.getLayer("zones-outline")) {
    map.setLayoutProperty("zones-outline", "visibility", "none");
  }
}

// Zones view
function showZonesView() {

  map.once("idle", () => {

    if (!map.getSource("climate-zones")) {

      map.addSource("climate-zones", {
        type: "geojson",
        data: "/data/zones.geojson", 
      });

      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "climate-zones",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.4,
        },
      });

      map.addLayer({
        id: "zones-outline",
        type: "line",
        source: "climate-zones",
        paint: {
          "line-color": "#ffffff",
          "line-width": 2,
        },
      });

    } else {
      map.setLayoutProperty("zones-fill", "visibility", "visible");
      map.setLayoutProperty("zones-outline", "visibility", "visible");
    }

  });
}

// When the map first loads, show the regular map view
map.on("load", () => {
  showRegularView();
});