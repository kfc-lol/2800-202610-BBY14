document.querySelectorAll('.dropdown-button').forEach(icon => {
    icon.addEventListener('click', () => {
        const card = icon.closest('.zoneInfoDropdown');
        const content = card.querySelector('.cardContent');
        const isOpen = content.classList.toggle('open');
        icon.classList.toggle('open', isOpen);
    });
});