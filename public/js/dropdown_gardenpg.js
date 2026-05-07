document.querySelectorAll('.crop-card').forEach(card => {
  card.addEventListener('click', () => {

    card.classList.toggle('expanded');
    const dropdownIcon = card.querySelector('.dropdown-icon');
  });
});