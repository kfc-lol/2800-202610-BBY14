const fields = [
  { val: "val-username", inp: "inp-username" },
  { val: "val-email", inp: "inp-email" },
];

function startEdit() {
  fields.forEach(({ val, inp }) => {
    document.getElementById(val).style.display = "none";
    document.getElementById(inp).style.display = "block";
  });
  document.getElementById("edit-btn").style.display = "none";
  document.getElementById("save-btn").style.display = "inline-block";
  document.getElementById("cancel-btn").style.display = "inline-block";
  document.getElementById("inp-username").focus();
}

function cancelEdit() {
  fields.forEach(({ val, inp }) => {
    document.getElementById(val).style.display = "";
    document.getElementById(inp).style.display = "none";
  });
  document.getElementById("edit-btn").style.display = "inline-block";
  document.getElementById("save-btn").style.display = "none";
  document.getElementById("cancel-btn").style.display = "none";
}

function submitProfile() {
  const originalUsername = document.getElementById("val-username").textContent;
  const originalEmail = document.getElementById("val-email").textContent;

  const newUsername = document.getElementById("inp-username").value;
  const newEmail = document.getElementById("inp-email").value;

  // If nothing changed, just go back to read mode
  if (originalUsername === newUsername && originalEmail === newEmail) {
    cancelEdit();
    return;
  }

  document.getElementById('form-username').value = newUsername;
  document.getElementById('form-email').value    = newEmail;
  document.getElementById('profile-form').submit();
}

setTimeout(function () {
    if (!document.getElementById("message")) return;
    document.getElementById("message").style.display = "none";
}, 3000);

function showLogoutPrompt() {
  const prompt = document.getElementById('logout-prompt');
  prompt.style.display = 'flex';
}

function hideLogoutPrompt() {
  const prompt = document.getElementById('logout-prompt');
  prompt.style.display = 'none';
}

document.getElementById('logout-prompt').addEventListener('click', function(e) {
  if (e.target === this) hideLogoutPrompt();
});

function confirmLogout() {
  window.location.href = '/logout';
}