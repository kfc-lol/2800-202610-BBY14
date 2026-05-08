document.querySelectorAll('.dropdown-button').forEach(button => {
  button.addEventListener('click', () => {

    const card = button.closest('.crop-card');
    card.classList.toggle('expanded');
    const dropdownIcon = card.querySelector('.dropdown-button');
  });
});