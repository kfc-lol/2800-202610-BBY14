let history = [];

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  appendMessage("user", message);
  setLoading(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);

    const reply = data.reply || "Sorry, something went wrong.";

    history.push({ role: "user", text: message });
    history.push({ role: "model", text: reply });

    appendMessage("assistant", reply);
  } catch (err) {
    console.error("Fetch error:", err);
    appendMessage("assistant", "Sorry, I couldn't connect. Please try again.");
  }

  setLoading(false);
}

function appendMessage(role, text) {
  const container = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.classList.add("message", role);
  div.innerHTML = `<div class="bubble">${text.replace(/\n/g, "<br>")}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function setLoading(isLoading) {
  const btn = document.getElementById("sendBtn");
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "..." : "Send";
}

document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});