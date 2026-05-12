const popup = document.querySelector('.popup');
const stepText = popup.querySelector('.popup-step-text');
const nextBtn = popup.querySelector('.popup-next');
const backBtn = popup.querySelector('.popup-back');
//const skipBtn = popup.querySelector('.popup-skip');

const steps = Array.from(popup.querySelectorAll('.popup-step'))
  .map(el => el.textContent);

let currentStep = 0;

// if index is the final step, then 
// display 'Done', otherwise, 'Next'
function showStep(index) {
  stepText.textContent = steps[index];
  nextBtn.textContent = index === steps.length - 1 ? 'Done' : 'Next';
}

showStep(0);

async function onDone() {
  popup.style.display = 'none';

  const feature = nextBtn.id;

  await fetch('/api/user/skip-feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature }),
  });
}

nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  } else {
    onDone();
  }
});

backBtn.addEventListener('click', () => {
  if (currentStep == 0) return;
  
  if (currentStep < steps.length + 1) {
    currentStep--;
    showStep(currentStep);
  } else {
    popup.style.display = 'none';
  }
});

/*
skipBtn.addEventListener('click', async () => {
  const feature = skipBtn.id;

  await fetch('/api/user/skip-feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature }),
  });

  popup.style.display = 'none';
});
*/