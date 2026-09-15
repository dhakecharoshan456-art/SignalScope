/**
 * SignalScope - Calibrated 3D Interactive Tilt Engine
 * Strictly limited to Images and the Investigator Login Card.
 * Subtle, low-amplitude tilt physics (max 5 deg) with smooth damping and gentle glare.
 */

(function() {
  'use strict';

  class Tilt3DManager {
    constructor() {
      this.init();
    }

    init() {
      this.bindCards();
    }

    bindCards() {
      // 3D tilt animation is strictly for showcase images / lens only
      // (Login Page Card and Visualizer / Inspection Studio strictly have NO 3D animation)
      const selectors = [
        '#forensic-lens-container',  // The Forensic Split Comparison Lens Image
        '.showcase-img-card'         // Feature Photo & Gallery Showcase Images
      ];

      // Explicitly cleanup any 3D classes/styles on visualizer and login card elements
      const non3dElements = document.querySelectorAll(
        '#hero-auth-card, #hero-auth-card-unlocked, #hero-auth-card-content, ' +
        '#visualizer .panel-3d-active, #visualizer .perspective-3d-root, #image-relative-wrapper'
      );
      non3dElements.forEach(el => {
        el.classList.remove('panel-3d-active', 'perspective-3d-root', 'panel-3d', 'holo-border-3d');
        el.style.transform = 'none';
        el.style.boxShadow = '';
        delete el.dataset.tilt3dInitialized;
        const glare = el.querySelector('.panel-3d-glare');
        if (glare) glare.remove();
      });

      const heroCard = document.getElementById('hero-auth-card');
      if (heroCard && heroCard.parentElement) {
        heroCard.parentElement.classList.remove('perspective-3d-root');
      }

      const elements = document.querySelectorAll(selectors.join(', '));

      elements.forEach(card => {
        if (card.dataset.tilt3dInitialized) return;
        card.dataset.tilt3dInitialized = 'true';

        // Add 3D container styling
        card.classList.add('panel-3d-active');
        if (card.parentElement && !card.parentElement.classList.contains('perspective-3d-root')) {
          card.parentElement.classList.add('perspective-3d-root');
        }

        // Create subtle specular glare overlay
        let glare = card.querySelector('.panel-3d-glare');
        if (!glare) {
          glare = document.createElement('div');
          glare.className = 'panel-3d-glare';
          card.appendChild(glare);
        }

        this.attachTiltEvents(card, glare);
      });
    }

    attachTiltEvents(card, glare) {
      let isHovered = false;
      let rafId = null;
      let targetRotateX = 0;
      let targetRotateY = 0;
      let targetGlareX = 50;
      let targetGlareY = 50;
      let currentRotateX = 0;
      let currentRotateY = 0;

      // Decreased 3D animation amplitude per user request (subtle, non-distracting)
      const maxTilt = 5; // degrees (decreased from 10)
      const maxTranslateZ = 8; // px (decreased from 16)

      const updateTransform = () => {
        // Damped spring interpolation
        currentRotateX += (targetRotateX - currentRotateX) * 0.14;
        currentRotateY += (targetRotateY - currentRotateY) * 0.14;

        if (isHovered) {
          const shadowX = -currentRotateY * 1.5;
          const shadowY = currentRotateX * 1.5 + 8;
          const shadowBlur = 20 + Math.abs(currentRotateX);

          card.style.transform = `perspective(1000px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) translateZ(${maxTranslateZ}px) scale3d(1.01, 1.01, 1.01)`;
          card.style.boxShadow = `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${shadowBlur.toFixed(1)}px rgba(0, 0, 0, 0.14), 0 0 20px rgba(56, 189, 248, 0.08)`;

          if (glare) {
            glare.style.opacity = '1';
            glare.style.background = `radial-gradient(circle at ${targetGlareX.toFixed(1)}% ${targetGlareY.toFixed(1)}%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 70%)`;
          }

          rafId = requestAnimationFrame(updateTransform);
        } else {
          // Spring smoothly back to neutral
          currentRotateX += (0 - currentRotateX) * 0.12;
          currentRotateY += (0 - currentRotateY) * 0.12;

          if (Math.abs(currentRotateX) < 0.03 && Math.abs(currentRotateY) < 0.03) {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
            card.style.boxShadow = '';
            if (glare) glare.style.opacity = '0';
            cancelAnimationFrame(rafId);
            rafId = null;
          } else {
            card.style.transform = `perspective(1000px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) translateZ(0px) scale3d(1, 1, 1)`;
            rafId = requestAnimationFrame(updateTransform);
          }
        }
      };

      card.addEventListener('mouseenter', () => {
        isHovered = true;
        card.style.transition = 'none';
        if (!rafId) rafId = requestAnimationFrame(updateTransform);
      });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Normalized offsets from center (-1 to 1)
        const normX = (mouseX / width) * 2 - 1;
        const normY = (mouseY / height) * 2 - 1;

        // Target rotation (subtle, soft angle)
        targetRotateX = -normY * maxTilt;
        targetRotateY = normX * maxTilt;

        // Glare coordinates
        targetGlareX = (mouseX / width) * 100;
        targetGlareY = (mouseY / height) * 100;
      });

      card.addEventListener('mouseleave', () => {
        isHovered = false;
        targetRotateX = 0;
        targetRotateY = 0;
        card.style.transition = 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.55s cubic-bezier(0.23, 1, 0.32, 1)';
        if (!rafId) rafId = requestAnimationFrame(updateTransform);
      });
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.tilt3DManager = new Tilt3DManager();
    });
  } else {
    window.tilt3DManager = new Tilt3DManager();
  }
})();
