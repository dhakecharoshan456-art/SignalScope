// SignalScope - How It Works Modal Controller

(function () {
  'use strict';

  function openModal() {
    const modal = document.getElementById('how-it-works-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (document.body && document.body.classList) {
        document.body.classList.add('overflow-hidden');
      }
    }
  }

  function closeModal() {
    const modal = document.getElementById('how-it-works-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      if (document.body && document.body.classList) {
        document.body.classList.remove('overflow-hidden');
      }
    }
  }

  function navigateToStudio() {
    closeModal();
    const studio = document.getElementById('visualizer');
    if (studio) {
      studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.openHowItWorksModal = openModal;
  window.closeHowItWorksModal = closeModal;
  window.howItWorksTryStudio = navigateToStudio;

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
})();
