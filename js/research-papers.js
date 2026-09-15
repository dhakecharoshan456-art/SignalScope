// SignalScope - Research Papers & Academic Foundations Module

(function () {
  'use strict';

  function initResearchPapers() {
    const filterButtons = document.querySelectorAll('.research-filter-btn');
    const paperCards = document.querySelectorAll('.research-paper-card');
    const searchInput = document.getElementById('research-search-input');
    const resultsCountEl = document.getElementById('research-results-count');

    if (!filterButtons.length || !paperCards.length) return;

    let activeFilter = 'all';
    let searchQuery = '';

    function filterPapers() {
      let visibleCount = 0;

      paperCards.forEach(card => {
        const category = card.getAttribute('data-category') || '';
        const title = (card.querySelector('.research-paper-title')?.textContent || '').toLowerCase();
        const abstract = (card.querySelector('.research-paper-abstract')?.textContent || '').toLowerCase();
        const authors = (card.querySelector('.research-paper-authors')?.textContent || '').toLowerCase();

        const matchesCategory = (activeFilter === 'all') || (category === activeFilter);
        const matchesSearch = !searchQuery || title.includes(searchQuery) || abstract.includes(searchQuery) || authors.includes(searchQuery);

        if (matchesCategory && matchesSearch) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      if (resultsCountEl) {
        resultsCountEl.textContent = `Showing ${visibleCount} of ${paperCards.length} papers`;
      }

      if (window.updateScrollReveal) {
        window.updateScrollReveal();
      }
    }

    // Filter pill click listeners
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => {
          b.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow-md');
          b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
        });

        btn.classList.add('active', 'bg-blue-600', 'text-white', 'shadow-md');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');

        activeFilter = btn.getAttribute('data-filter') || 'all';
        filterPapers();
      });
    });

    // Search input listener
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterPapers();
      });
    }

    // Abstract Expand / Collapse Toggles
    document.querySelectorAll('.toggle-abstract-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.research-paper-card');
        if (!card) return;
        const fullAbstract = card.querySelector('.research-abstract-full');
        const shortAbstract = card.querySelector('.research-abstract-short');
        const icon = btn.querySelector('.abstract-toggle-icon');
        const text = btn.querySelector('.abstract-toggle-text');

        if (fullAbstract && shortAbstract) {
          const isExpanded = !fullAbstract.classList.contains('hidden');
          if (isExpanded) {
            fullAbstract.classList.add('hidden');
            shortAbstract.classList.remove('hidden');
            if (text) text.textContent = 'Expand Abstract';
            if (icon) icon.style.transform = 'rotate(0deg)';
          } else {
            fullAbstract.classList.remove('hidden');
            shortAbstract.classList.add('hidden');
            if (text) text.textContent = 'Collapse Abstract';
            if (icon) icon.style.transform = 'rotate(180deg)';
          }
        }
      });
    });

    // Copy Citation handler
    document.querySelectorAll('.copy-citation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const citation = btn.getAttribute('data-citation');
        if (citation) {
          navigator.clipboard.writeText(citation).then(() => {
            if (window.showToast) {
              window.showToast('BibTeX citation copied to clipboard!', 'success');
            } else {
              alert('Citation copied to clipboard!');
            }
          }).catch(err => {
            console.error('Failed to copy citation:', err);
          });
        }
      });
    });
  }

  // Initialize once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResearchPapers);
  } else {
    initResearchPapers();
  }
})();
