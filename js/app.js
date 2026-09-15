// SignalScope - Main Application Orchestrator

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Light Theme by Default
  initTheme();

  // 2. Global Data Store (GenImage Benchmarks)
  let siteData = window.FALLBACK_DATA || {};
  try {
    const res = await fetch('./assets/data.json');
    if (res.ok) {
      siteData = await res.json();
    }
  } catch (err) {
    console.warn('Using embedded dataset store:', err);
  }

  // 3. Initialize Authentication & Persona Manager
  if (window.SignalScopeAuth) {
    window.SignalScopeAuth.init();
  }

  // 4. Initialize Bonus Modules (A–G)
  if (window.SignalScopeBonus) {
    window.SignalScopeBonus.init();
  }

  // 5. Initialize Core Visualizer & Forensic Detector
  if (window.VisualizerManager) {
    window.visualizerManager = new window.VisualizerManager();
  }

  // 6. Initialize Leaderboard & Charts
  if (window.LeaderboardManager && siteData.table3_sd14) {
    window.leaderboardManager = new window.LeaderboardManager(siteData);
  }

  // 7. Initialize Code Copy & Toast
  initCopyButtons();

  // 8. Initialize Mobile Navigation
  initMobileNav();
});

// Light / Dark Theme Toggler (Default is Light Mode)
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const moonIcon = document.getElementById('theme-icon-moon');
  const sunIcon = document.getElementById('theme-icon-sun');
  const savedTheme = localStorage.getItem('signalscope_theme');

  // Default is LIGHT unless user explicitly chose dark
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (moonIcon) moonIcon.classList.add('hidden');
    if (sunIcon) sunIcon.classList.remove('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    if (moonIcon) moonIcon.classList.remove('hidden');
    if (sunIcon) sunIcon.classList.add('hidden');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      if (isDark) {
        document.documentElement.classList.remove('light');
        localStorage.setItem('signalscope_theme', 'dark');
        if (moonIcon) moonIcon.classList.add('hidden');
        if (sunIcon) sunIcon.classList.remove('hidden');
        showToast('Dark mode enabled');
      } else {
        document.documentElement.classList.add('light');
        localStorage.setItem('signalscope_theme', 'light');
        if (moonIcon) moonIcon.classList.remove('hidden');
        if (sunIcon) sunIcon.classList.add('hidden');
        showToast('Light mode enabled');
      }
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark } }));
    });
  }
}

// Toast notification system
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'warning') {
    iconSvg = `
      <div class="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/40">
        <svg class="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
    `;
  } else if (type === 'error') {
    iconSvg = `
      <div class="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0 border border-rose-500/40">
        <svg class="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    `;
  } else {
    iconSvg = `
      <div class="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/40">
        <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
    `;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="leading-tight">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Copy button handlers
function initCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const text = targetEl.innerText || targetEl.textContent;
        navigator.clipboard.writeText(text.trim()).then(() => {
          showToast('Snippet copied to clipboard!');
        }).catch(err => {
          console.error('Copy failed:', err);
        });
      }
    });
  });

  document.querySelectorAll('[data-copy-text]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy-text');
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied: "${text}"`);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    });
  });
}

// Mobile Nav Menu
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (toggleBtn && mobileMenu) {
    toggleBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }
}

// API Docs Modal Controller
function openApiDocsModal() {
  const modal = document.getElementById('api-docs-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (document.body && document.body.classList) {
      document.body.classList.add('overflow-hidden');
    }
  }
}

function closeApiDocsModal() {
  const modal = document.getElementById('api-docs-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (document.body && document.body.classList) {
      document.body.classList.remove('overflow-hidden');
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeApiDocsModal();
  }
});

if (window.location.hash === '#api-docs') {
  setTimeout(() => openApiDocsModal(), 350);
}

// Expose globally
window.showToast = showToast;
window.openApiDocsModal = openApiDocsModal;
window.closeApiDocsModal = closeApiDocsModal;
