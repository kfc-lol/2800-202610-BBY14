const fields = [
  { val: "val-username", inp: "inp-username" },
  { val: "val-email", inp: "inp-email" },
];

let originalCity = "";

function startEdit() {
  fields.forEach(({ val, inp }) => {
    document.getElementById(val).style.display = "none";
    document.getElementById(inp).style.display = "flex";
  });

  // Capture original city when edit starts
  originalCity = document.getElementById("cityInput").value.trim();

  // Show location dropdown, hide location text
  document.getElementById("val-location").style.display = "none";
  document.getElementById("inp-location").style.display = "block";

  document.getElementById("edit-btn").style.display = "none";
  document.getElementById("save-buttn").style.display = "inline-flex";
  document.getElementById("cancel-btn").style.display = "inline-flex";
  document.getElementById("inp-username").focus();
}

function cancelEdit() {
  fields.forEach(({ val, inp }) => {
    document.getElementById(val).style.display = "";
    document.getElementById(inp).style.display = "none";
  });

  // Restore cityInput to original in case user selected something then cancelled
  document.getElementById("cityInput").value = originalCity;

  // Hide location dropdown, show location text
  document.getElementById("val-location").style.display = "";
  document.getElementById("inp-location").style.display = "none";

  // Close dropdown if open
  document.getElementById("cityDropdown").style.display = "none";

  document.getElementById("edit-btn").style.display = "inline-block";
  document.getElementById("save-buttn").style.display = "none";
  document.getElementById("cancel-btn").style.display = "none";
}

function submitProfile() {
  const originalUsername = document.getElementById("val-username").textContent.trim();
  const originalEmail = document.getElementById("val-email").textContent.trim();

  const newUsername = document.getElementById("inp-username").value;
  const newEmail = document.getElementById("inp-email").value;
  const newCity = document.getElementById("cityInput").value.trim();

  // If nothing changed, just go back to read mode
  if (
    originalUsername === newUsername &&
    originalEmail === newEmail &&
    originalCity === newCity
  ) {
    cancelEdit();
    return;
  }

  document.getElementById("form-username").value = newUsername;
  document.getElementById("form-email").value = newEmail;
  document.getElementById("form-city").value = newCity;
  document.getElementById("profile-form").submit();
}

// --- Location dropdown functions ---

function toggleDropdown() {
  const dropdown = document.getElementById("cityDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
}

function filterCities() {
  const input = document.getElementById("citySearch").value.toLowerCase();
  const links = document.querySelectorAll("#cityDropdown a");

  links.forEach((link) => {
    link.style.display = link.textContent.toLowerCase().includes(input)
      ? "block"
      : "none";
  });
}

function selectCity(el, event) {
  event.preventDefault(); // prevent <a href="#"> from jumping the page
  event.stopPropagation(); // prevent the outside-click listener from firing

  const city = el.getAttribute("data-city");
  const zone = el.getAttribute("data-zone");

  // Update hidden input with new city
  document.getElementById("cityInput").value = city;

  // Update zone display
  document.getElementById("displayZone").textContent = zone;
  document.getElementById("selectedDisplay").style.display = "block";

  // Update dropdown button label
  document.getElementById("location-dropbtn").textContent =
    el.textContent.trim() + " ▼";

  // Close dropdown
  document.getElementById("cityDropdown").style.display = "none";
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.matches(".dropbtn") && !e.target.closest("#cityDropdown")) {
    const dropdown = document.getElementById("cityDropdown");
    if (dropdown) dropdown.style.display = "none";
  }
});

// --- Flash message auto-hide ---

setTimeout(function () {
  const msg = document.getElementById("message");
  if (msg) msg.style.display = "none";
}, 3000);

// --- Logout prompt ---

function showLogoutPrompt() {
  document.getElementById("logout-prompt").style.display = "inline-flex";
}

function hideLogoutPrompt() {
  document.getElementById("logout-prompt").style.display = "none";
}

document.getElementById("logout-prompt").addEventListener("click", function (e) {
  if (e.target === this) hideLogoutPrompt();
});

function confirmLogout() {
  window.location.href = "/logout";
}