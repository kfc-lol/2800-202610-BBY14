const popup = document.querySelector('.popup');
const stepText = popup.querySelector('.popup-step-text');
const nextBtn = popup.querySelector('.popup-next');
const skipBtn = popup.querySelector('.popup-skip');

const steps = Array.from(popup.querySelectorAll('.popup-step'))
  .map(el => el.textContent);

let currentStep = 0;

function showStep(index) {
  stepText.textContent = steps[index];
  nextBtn.textContent = index === steps.length - 1 ? 'Done' : 'Next';
}

showStep(0);

nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  } else {
    popup.style.display = 'none'; // Done
  }
});

skipBtn.addEventListener('click', async () => {
  const feature = skipBtn.id;

  await fetch('/api/user/skip-feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature }),
  });

  popup.style.display = 'none';
});