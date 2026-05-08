document.querySelectorAll('.popup-skip').forEach(btn => {
  btn.addEventListener('click', async () => {
    const feature = btn.id;

    await fetch('/api/user/skip-feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: feature }),
    });

    btn.closest('.popup').style.display = 'none';
  });
});