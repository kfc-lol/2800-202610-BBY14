// gardenPage.js
(function () {

  /* ─── Modal ─── */

  const backdrop   = document.getElementById('modal-backdrop');
  const modalClose = document.getElementById('modal-close');
  const modalName  = document.getElementById('modal-crop-name');
  const modalZones = document.getElementById('modal-crop-zones');
  const modalBody  = document.getElementById('modal-body');
  const modalImg   = document.getElementById('modal-img');

  function openModal(plot) {
    const name   = plot.dataset.cropName;
    const zones  = plot.dataset.cropZones;
    const imgSrc = plot.dataset.cropImg;
    let info = [];
    try { info = JSON.parse(plot.dataset.cropInfo); } catch {}

    modalName.textContent  = name;
    modalZones.textContent = 'Zones: ' + zones;
    modalImg.src = imgSrc;
    modalImg.alt = name;
    modalBody.innerHTML = '';

    info.forEach(item => {
      const block = document.createElement('div');
      block.className = 'info-block';
      block.innerHTML = `
        <span class="info-title">${escHtml(item.title)}</span>
        <p class="info-content">${escHtml(item.content)}</p>
      `;
      modalBody.appendChild(block);
    });

    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.garden-plot').forEach(plot => {
    plot.addEventListener('click', (e) => {
      if (e.target.classList.contains('unsave-btn')) return;
      openModal(plot);
    });
  });

  modalClose.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  /* ─── Unsave ─── */

  document.querySelectorAll('.unsave-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cropId = btn.dataset.cropId;

      const res = await fetch('/saveCrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropId, action: 'unsave' })
      });

      if ((await res.json()).success) {
        const plot = document.getElementById('plot-' + cropId);
        plot.style.animation = 'sprout 0.3s reverse ease-in both';
        setTimeout(() => plot.remove(), 280);
      }
    });
  });

  /* ─── Search ─── */

  window.filterCrops = function (query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.garden-plot').forEach(plot => {
      const name = plot.dataset.cropName.toLowerCase();
      plot.classList.toggle('hidden', !name.includes(q));
    });
  };

  /* ─── Staggered Image Loader ─── */

  const images = Array.from(document.querySelectorAll('.plant-img[data-src]'));
  let index = 0;

  function loadNext() {
    if (index >= images.length) return;
    const img = images[index++];
    const cropId = img.id.replace('img-', '');

    img.onload = () => {
      img.style.display = 'block';
      const loader = document.getElementById('loading-' + cropId);
      if (loader) loader.style.display = 'none';
      setTimeout(loadNext, 400);
    };

    img.onerror = () => {
      const loader = document.getElementById('loading-' + cropId);
      if (loader) loader.style.display = 'none';
      setTimeout(loadNext, 400);
    };

    img.src = img.dataset.src;
  }

  // Start 3 parallel loading chains
  loadNext();
  loadNext();
  loadNext();

  /* ─── Utils ─── */

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();