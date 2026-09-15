/**
 * SignalScope - Dynamic Bi-directional Scroll Reveal Animations
 * - Every time user scrolls down: original animation (left from left, right from right, cards from bottom).
 * - Every time user scrolls up: reverse animation.
 * - Triggers on every scroll up and down continuously.
 */

(function() {
  'use strict';

  let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
  let ticking = false;
  let revealElements = [];

  function initScrollReveal() {
    // 1. Auto-decorate sections and multi-column rows if not explicitly marked
    autoDecorateElements();

    // 2. Query all reveal targets
    revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!revealElements.length) return;

    // Default scroll direction
    document.documentElement.setAttribute('data-scroll-dir', 'down');

    // 3. Attach scroll and resize listeners using requestAnimationFrame
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial check
    updateRevealStates();
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateRevealStates();
        ticking = false;
      });
      ticking = true;
    }
  }

  function refreshRevealElements() {
    revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
  }

  function updateRevealStates() {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const buffer = 45; // pixel threshold from viewport edges

    // Track scroll direction with small deadzone to prevent jitter
    if (currentScrollY > lastScrollY + 2) {
      document.documentElement.setAttribute('data-scroll-dir', 'down');
    } else if (currentScrollY < lastScrollY - 2) {
      document.documentElement.setAttribute('data-scroll-dir', 'up');
    }
    lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;

    // Check each target element
    revealElements.forEach(el => {
      // If element is hidden (e.g. filtered research cards), skip
      if (el.offsetParent === null && el.classList.contains('hidden')) {
        el.classList.remove('revealed');
        return;
      }

      const rect = el.getBoundingClientRect();
      const isHero = el.closest('.hero-sightengine-bg');

      // Always keep hero revealed if user is at the top of the page
      if (isHero && currentScrollY < 180) {
        el.classList.add('revealed');
        return;
      }

      // Check if element belongs to research-papers for optimized retreat threshold
      const isResearch = el.closest('#research-papers');
      const enterBuffer = isResearch ? 70 : buffer;
      const exitBuffer = isResearch ? 50 : buffer;

      // Check if element intersects the visible viewport
      const isVisible = rect.top < viewportHeight - enterBuffer && rect.bottom > exitBuffer;

      if (isVisible) {
        el.classList.add('revealed');
      } else {
        // Remove revealed so it replays the animation every time it re-enters or retreats!
        el.classList.remove('revealed');
      }
    });
  }

  function autoDecorateElements() {
    // A. Hero Section: Left content slides in from Left, Login Card from Right
    const heroGrid = document.querySelector('.hero-sightengine-bg .grid');
    if (heroGrid && heroGrid.children.length >= 2) {
      const leftHero = heroGrid.children[0];
      const rightHero = heroGrid.children[1];
      if (!leftHero.hasAttribute('data-reveal')) leftHero.setAttribute('data-reveal', 'left');
      if (!rightHero.hasAttribute('data-reveal')) rightHero.setAttribute('data-reveal', 'right');
    }

    // B. Capabilities Showcase Rows
    const showcaseSection = document.getElementById('capabilities-showcase');
    if (showcaseSection) {
      const rows = showcaseSection.querySelectorAll('.grid.items-center');
      rows.forEach(row => {
        if (row.children.length === 2) {
          const col1 = row.children[0];
          const col2 = row.children[1];
          if (!col1.hasAttribute('data-reveal')) col1.setAttribute('data-reveal', 'left');
          if (!col2.hasAttribute('data-reveal')) col2.setAttribute('data-reveal', 'right');
        }
      });

      // Winston trust card banner
      const winstonBanner = showcaseSection.querySelector('.rounded-3xl.p-8');
      if (winstonBanner && !winstonBanner.hasAttribute('data-reveal')) {
        winstonBanner.setAttribute('data-reveal', 'scale');
      }
    }

    // C. Studio Visualizer Workspace
    const visualizerSection = document.getElementById('visualizer');
    if (visualizerSection) {
      const studioHeader = visualizerSection.querySelector('.flex.flex-col.lg\\:flex-row');
      if (studioHeader && !studioHeader.hasAttribute('data-reveal')) {
        studioHeader.setAttribute('data-reveal', 'up');
      }

      const studioWorkspace = visualizerSection.querySelector('.grid.grid-cols-1.lg\\:grid-cols-12.gap-6');
      if (studioWorkspace && studioWorkspace.children.length >= 2) {
        const leftStudio = studioWorkspace.children[0];
        const rightStudio = studioWorkspace.children[1];
        if (!leftStudio.hasAttribute('data-reveal')) leftStudio.setAttribute('data-reveal', 'left');
        if (!rightStudio.hasAttribute('data-reveal')) rightStudio.setAttribute('data-reveal', 'right');
      }
    }

    // D. Forensic Lens Lab Section
    const lensLabSection = document.getElementById('forensic-lens-lab');
    if (lensLabSection) {
      const labHeader = lensLabSection.firstElementChild;
      if (labHeader && !labHeader.hasAttribute('data-reveal')) {
        labHeader.setAttribute('data-reveal', 'up');
      }

      const labGrid = lensLabSection.querySelector('.grid.grid-cols-1.lg\\:grid-cols-12');
      if (labGrid && labGrid.children.length >= 2) {
        const leftLens = labGrid.children[0];
        const rightOscilloscope = labGrid.children[1];
        if (!leftLens.hasAttribute('data-reveal')) leftLens.setAttribute('data-reveal', 'left');
        if (!rightOscilloscope.hasAttribute('data-reveal')) rightOscilloscope.setAttribute('data-reveal', 'right');
      }
    }

    // E. Inspection History Section
    const historySection = document.getElementById('inspection-history');
    if (historySection) {
      const historyHeader = historySection.querySelector('div:first-child');
      if (historyHeader && !historyHeader.hasAttribute('data-reveal')) {
        historyHeader.setAttribute('data-reveal', 'up');
      }
      
      const statsGrid = document.getElementById('history-stats-grid');
      if (statsGrid && !statsGrid.hasAttribute('data-reveal')) {
        statsGrid.setAttribute('data-reveal', 'scale');
      }

      const logContainer = document.getElementById('inspection-history-logs');
      if (logContainer && !logContainer.hasAttribute('data-reveal')) {
        logContainer.setAttribute('data-reveal', 'up');
      }
    }

    // F. Batch Scan Section
    const batchSection = document.getElementById('batch-scan');
    if (batchSection) {
      const batchGrid = batchSection.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
      if (batchGrid && batchGrid.children.length >= 2) {
        const leftBatch = batchGrid.children[0];
        const rightBatch = batchGrid.children[1];
        if (!leftBatch.hasAttribute('data-reveal')) leftBatch.setAttribute('data-reveal', 'left');
        if (!rightBatch.hasAttribute('data-reveal')) rightBatch.setAttribute('data-reveal', 'right');
      }
    }

    // G. Degradation Lab Section
    const degradationSection = document.getElementById('degradation-lab');
    if (degradationSection) {
      const degGrid = degradationSection.querySelector('.grid.grid-cols-1.lg\\:grid-cols-12');
      if (degGrid && degGrid.children.length >= 2) {
        const leftDeg = degGrid.children[0];
        const rightDeg = degGrid.children[1];
        if (!leftDeg.hasAttribute('data-reveal')) leftDeg.setAttribute('data-reveal', 'left');
        if (!rightDeg.hasAttribute('data-reveal')) rightDeg.setAttribute('data-reveal', 'right');
      }
    }

    // H. Benchmark, Hackathon Guide & Leaderboard Sections
    ['leaderboard', 'hackathon-guide', 'model-report'].forEach(secId => {
      const sec = document.getElementById(secId);
      if (sec && !sec.hasAttribute('data-reveal')) {
        sec.setAttribute('data-reveal', 'up');
      }
    });

    // I. Research Papers Section (Left parts from left, right parts from right)
    const researchSection = document.getElementById('research-papers');
    if (researchSection) {
      const paperCards = researchSection.querySelectorAll('.research-paper-card');
      paperCards.forEach((card, idx) => {
        if (!card.hasAttribute('data-reveal')) {
          // Even index (cards 1, 3, 5): Left column -> left
          // Odd index (cards 2, 4, 6): Right column -> right
          card.setAttribute('data-reveal', idx % 2 === 0 ? 'left' : 'right');
        }
      });
    }
  }

  // Expose global updater so dynamic components (like research filter/search) can trigger animation refresh
  window.updateScrollReveal = function() {
    refreshRevealElements();
    updateRevealStates();
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollReveal);
  } else {
    initScrollReveal();
  }
})();
