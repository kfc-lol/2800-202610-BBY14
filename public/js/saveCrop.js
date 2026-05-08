document.querySelectorAll('.save-button, .unsave-button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const cropId = btn.id;
    const isSaved = btn.classList.contains('save-button');
    const action = isSaved ? 'unsave' : 'save';

    const res = await fetch('/saveCrop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cropId, action })
    });

    if ((await res.json()).success) {
      if (action === 'save') {
        btn.src = '/img/savedbookmark.png';
        btn.classList.replace('unsave-button', 'save-button');
      } else {
        btn.src = '/img/unsavedbookmark.png';
        btn.classList.replace('save-button', 'unsave-button');
      }
    }
  });
});