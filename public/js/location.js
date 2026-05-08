function toggleDropdown() {
  const dropdown = document.getElementById("cityDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
}

function filterCities() {
  const input = document.getElementById("citySearch").value.toLowerCase();
  const links = document.querySelectorAll("#cityDropdown a");

  links.forEach(link => {
    link.style.display = link.textContent.toLowerCase().includes(input) ? "block" : "none";
  });
}

function selectCity(el) {
  const city = el.getAttribute("data-city");
  const zone = el.getAttribute("data-zone");

  // Fill hidden input
  document.getElementById("cityInput").value = city;

  // Update display
  document.getElementById("displayCity").textContent = el.textContent.trim();
  document.getElementById("displayZone").textContent = zone;
  document.getElementById("selectedDisplay").style.display = "block";

  // Show submit button and update dropdown button label
  document.getElementById("submitBtn").style.display = "inline-block";
  document.querySelector(".dropbtn").textContent = el.textContent.trim() + " ▼";

  // Close dropdown
  document.getElementById("cityDropdown").style.display = "none";
}

// Close dropdown if clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.matches(".dropbtn") && !e.target.closest("#cityDropdown")) {
    document.getElementById("cityDropdown").style.display = "none";
  }
});