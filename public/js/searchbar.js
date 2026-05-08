function filterCrops(query) {
  const cards = document.querySelectorAll('.crop-card');
  const q = query.toLowerCase().trim();

  cards.forEach(card => {
    const name = card.querySelector('.crop-name').textContent.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
}