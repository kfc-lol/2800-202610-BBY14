const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/019e040c-ff22-7517-a2ef-d5507450dd40/style.json?key=${MAPTILER_KEY}`,
  center: [-123.1207, 49.2827],
  zoom: 11,
});

map.addControl(new maplibregl.NavigationControl());

let currentView = "regular";
let userLat = null;
let userLng = null;

function switchView(view) {
  currentView = view;
  document.getElementById("btn-regular").classList.toggle("active", view === "regular");
  document.getElementById("btn-zones").classList.toggle("active", view === "zones");

  const legend = document.getElementById("zone-legend");
  if (legend) legend.style.display = view === "zones" ? "block" : "none";

  if (view === "regular") {
    showRegularView();
  } else {
    showZonesView();
  }
}

function showRegularView() {
  if (map.getLayer("zones-fill")) map.setLayoutProperty("zones-fill", "visibility", "none");
  if (map.getLayer("zones-highlight")) map.setLayoutProperty("zones-highlight", "visibility", "none");
  if (map.getLayer("zones-outline")) map.setLayoutProperty("zones-outline", "visibility", "none");

  const banner = document.getElementById("zone-banner");
  if (banner) banner.style.display = "none";
}

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
          "fill-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "zones-highlight",
        type: "fill",
        source: "climate-zones",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.45,
        },
        filter: ["==", ["get", "zone"], ""],
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

      highlightUserZone();

    } else {
      map.setLayoutProperty("zones-fill", "visibility", "visible");
      map.setLayoutProperty("zones-highlight", "visibility", "visible");
      map.setLayoutProperty("zones-outline", "visibility", "visible");
      highlightUserZone();
    }
  });
}

function highlightUserZone() {
  if (userLat === null || userLng === null) return;

  // Wait until the zones are fully rendered before querying
  map.once("idle", () => {
    const point = map.project([userLng, userLat]);
    const features = map.queryRenderedFeatures(point, { layers: ["zones-fill"] });

    if (features.length > 0) {
      const zone = features[0].properties.zone;
      const name = features[0].properties.name;

      map.setFilter("zones-highlight", ["==", ["get", "zone"], zone]);

      const banner = document.getElementById("zone-banner");
      if (banner) {
        banner.textContent = `You are in: ${name}`;
        banner.style.display = "block";
      }
    } else {
      console.warn("No zone found at user location:", userLat, userLng);
    }
  });
}

map.on("load", () => {
  showRegularView();

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;

        const el = document.createElement("div");
        el.style.width = "18px";
        el.style.height = "18px";
        el.style.borderRadius = "50%";
        el.style.background = "#1a73e8";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 0 6px rgba(0,0,0,0.4)";

        const popup = new maplibregl.Popup({ offset: 25 }).setText("You are here");

        new maplibregl.Marker({ element: el })
          .setLngLat([userLng, userLat])
          .setPopup(popup)
          .addTo(map);

        map.flyTo({ center: [userLng, userLat], zoom: 12, speed: 1.2 });
      },
      (err) => {
        console.warn("Location access denied or unavailable:", err.message);
      }
    );
  } else {
    console.warn("Geolocation is not supported by this browser.");
  }
});