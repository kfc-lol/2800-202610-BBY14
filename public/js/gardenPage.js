// gardenPage.js

function addGrass(el, opts = {}) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;";
  el.appendChild(canvas); // appended last, lowest stacking order

  const SWAY_AMP = opts.swayAmp ?? 6;
  const SWAY_SPEED = opts.swaySpeed ?? 0.0001;
  const GUST_SPEED = opts.gustSpeed ?? 0.000032;
  const GUST_AMP = opts.gustAmp ?? 3.2;

  let blades = [],
    W,
    H,
    raf;
  const ctx = canvas.getContext("2d");

  function init() {
    W = canvas.width = el.offsetWidth;
    H = canvas.height = el.offsetHeight;
    blades = [];

    const numRows = 20;
    const spacing = 20;
    const cols = Math.ceil(W / spacing) + 1;

    // Palette based on #577a48 (HSL 96, 26%, 38%)
    const colorPalette = [
      { h: 96, s: 20, l: 30 }, // Darker Pastel Green
      { h: 96, s: 26, l: 38 }, // Your #577a48 Base Color
      { h: 96, s: 30, l: 48 }, // Lighter Pastel Green
    ];

    for (let row = 0; row < numRows; row++) {
      const baseY = ((row + 0.5) / numRows) * H;
      const density = Math.floor(cols * 1.4);

      for (let i = 0; i < density; i++) {
        const x = (i / density) * W + (Math.random() - 0.5) * spacing * 2;

        // Randomly select from your pastel palette
        const pickedColor =
          colorPalette[Math.floor(Math.random() * colorPalette.length)];

        blades.push({
          x,
          baseY,
          h: 10 + Math.random() * 16 + (row / numRows) * 6,
          phase: Math.random() * Math.PI * 2,
          gPhase: Math.random() * Math.PI * 2,
          lean: (Math.random() - 0.5) * 4,
          width: 0.8 + Math.random() * 0.8, // Slightly thicker for the pastel look
          hue: pickedColor.h,
          sat: pickedColor.s,
          lum: pickedColor.l,
          alpha: 0.9,
        });
      }
    }
    blades.sort((a, b) => a.baseY - b.baseY);
  }

  init();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  function tick(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    for (let i = 0; i < blades.length; i++) {
      const b = blades[i];
      const sway =
        Math.sin(t * SWAY_SPEED * 60 + b.phase) * SWAY_AMP +
        Math.sin(t * GUST_SPEED * 60 + b.gPhase) * GUST_AMP +
        b.lean;
      ctx.beginPath();
      ctx.moveTo(b.x, b.baseY);
      ctx.quadraticCurveTo(
        b.x + sway * 0.4,
        b.baseY - b.h * 0.52,
        b.x + sway,
        b.baseY - b.h,
      );
      ctx.lineWidth = b.width;
      ctx.strokeStyle = `hsla(${b.hue},${b.sat}%,${b.lum}%,${b.alpha})`;
      ctx.stroke();
    }
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
}

addGrass(document.querySelector(".garden-ground"));
(function () {
  /* ─── Modal ─── */

  const backdrop = document.getElementById("modal-backdrop");
  const modalClose = document.getElementById("modal-close");
  const modalName = document.getElementById("modal-crop-name");
  const modalZones = document.getElementById("modal-crop-zones");
  const modalBody = document.getElementById("modal-body");
  const modalImg = document.getElementById("modal-img");

  function openModal(plot) {
    const name = plot.dataset.cropName;
    const zones = plot.dataset.cropZones;
    const imgSrc = plot.dataset.cropImg;
    let info = [];
    try {
      info = JSON.parse(plot.dataset.cropInfo);
    } catch {}

    modalName.textContent = name;
    modalZones.textContent = "Zones: " + zones;
    modalImg.src = imgSrc;
    modalImg.alt = name;
    modalBody.innerHTML = "";

    info.forEach((item) => {
      const block = document.createElement("div");
      block.className = "info-block";
      block.innerHTML = `
        <span class="info-title">${escHtml(item.title)}</span>
        <p class="info-content">${escHtml(item.content)}</p>
      `;
      modalBody.appendChild(block);
    });

    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".garden-plot").forEach((plot) => {
    plot.addEventListener("click", (e) => {
      if (e.target.classList.contains("unsave-btn")) return;
      openModal(plot);
    });
  });

  modalClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  /* ─── Unsave ─── */

  document.querySelectorAll(".unsave-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cropId = btn.dataset.cropId;

      const res = await fetch("/saveCrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cropId, action: "unsave" }),
      });

      if ((await res.json()).success) {
        const plot = document.getElementById("plot-" + cropId);
        plot.style.animation = "sprout 0.3s reverse ease-in both";
        setTimeout(() => plot.remove(), 280);
      }
    });
  });

  /* ─── Search ─── */

  window.filterCrops = function (query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".garden-plot").forEach((plot) => {
      const name = plot.dataset.cropName.toLowerCase();
      plot.classList.toggle("hidden", !name.includes(q));
    });
  };

/* ─── Concurrent Image Loader ─── */
const images = Array.from(document.querySelectorAll(".plant-img[data-src]"));
const CONCURRENCY = 2;
const RETRY_DELAY = 4000;   // how long to wait before retrying a 202
const MAX_RETRIES = 15;     // ~1 minute of retrying before giving up
let queueIndex = 0;
let activeCount = 0;

function loadImage(img) {
  const cropId = img.id.replace("img-", "");
  const loader = document.getElementById("loading-" + cropId);
  const src = img.dataset.src;
  let attempts = 0;

  function attempt() {
    attempts++;
    const url = src + "&_t=" + attempts; // prevent browser caching the 202

    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";

    xhr.onload = () => {
      if (xhr.status === 200) {
        img.src = URL.createObjectURL(xhr.response);
        img.style.display = "block";
        if (loader) loader.style.display = "none";
        activeCount--;
        scheduleNext();
      } else if (xhr.status === 202 && attempts < MAX_RETRIES) {
        // Server is still generating — retry after delay
        setTimeout(attempt, RETRY_DELAY);
      } else {
        if (loader) loader.style.display = "none";
        activeCount--;
        scheduleNext();
      }
    };

    xhr.onerror = () => {
      if (loader) loader.style.display = "none";
      activeCount--;
      scheduleNext();
    };

    xhr.send();
  }

  attempt();
}

function scheduleNext() {
  while (activeCount < CONCURRENCY && queueIndex < images.length) {
    activeCount++;
    loadImage(images[queueIndex++]);
  }
}

scheduleNext();

  /* ─── Utils ─── */

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
