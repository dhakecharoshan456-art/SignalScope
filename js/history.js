/**
 * SignalScope Persistent Inspection History Manager
 * Connects directly to SQLite Database (signalscope.db) via GET /api/inspections
 * Displays all past photos inspected by the user, their AI vs Real status, confidence, and timestamps.
 */

class InspectionHistoryManager {
  constructor() {
    this.container = document.getElementById('inspection-history-list');
    this.statTotal = document.getElementById('hist-stat-total');
    this.statAi = document.getElementById('hist-stat-ai');
    this.statReal = document.getElementById('hist-stat-real');
    this.statUser = document.getElementById('hist-stat-user');
    this.filterSelect = document.getElementById('hist-filter-prediction');
    this.searchInput = document.getElementById('hist-search-input');
    this.btnRefresh = document.getElementById('btn-refresh-history');

    this.inspections = [];
    this.currentFilter = 'all';
    this.searchQuery = '';

    this.init();
  }

  init() {
    this.attachEvents();
    this.loadHistory();

    // Listen for new inspections being saved or auth changes
    window.addEventListener('inspection-saved', () => {
      setTimeout(() => this.loadHistory(), 400);
    });

    window.addEventListener('auth-changed', () => {
      this.loadHistory();
    });
  }

  openModal() {
    const modal = document.getElementById('inspection-history-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      this.loadHistory();
    }
  }

  closeModal() {
    const modal = document.getElementById('inspection-history-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }
  }

  attachEvents() {
    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.render();
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => {
        this.loadHistory(true);
      });
    }

    const navBtn = document.getElementById('top-nav-history-btn');
    if (navBtn) {
      navBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    const heroBtn = document.getElementById('btn-hero-history');
    if (heroBtn) {
      heroBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    const closeBtn = document.getElementById('close-history-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Check URL hash on page load
    if (window.location.hash === '#history' || window.location.hash === '#inspection-history') {
      setTimeout(() => this.openModal(), 350);
    }
  }

  async loadHistory(showToastFeedback = false) {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const phone = user ? encodeURIComponent(user.phone) : '';
    const url = phone ? `/api/inspections?phone=${phone}` : '/api/inspections';

    try {
      const resp = await fetch(url);
      if (resp.ok) {
        this.inspections = await resp.json();
        this.updateStats();
        this.render();
        if (showToastFeedback && window.showToast) {
          window.showToast('Inspection database refreshed from SQLite.');
        }
      }
    } catch (err) {
      console.warn('Could not load persistent history from SQLite:', err);
    }
  }

  updateStats() {
    const total = this.inspections.length;
    const aiCount = this.inspections.filter(i => (i.prediction || '').toUpperCase().includes('AI')).length;
    const realCount = this.inspections.filter(i => (i.prediction || '').toUpperCase().includes('REAL') || (i.prediction || '').toUpperCase().includes('AUTH')).length;
    const user = window.authManager ? window.authManager.getCurrentUser() : null;

    if (this.statTotal) this.statTotal.textContent = total;
    if (this.statAi) this.statAi.textContent = aiCount;
    if (this.statReal) this.statReal.textContent = realCount;
    if (this.statUser) {
      this.statUser.textContent = user ? `${user.name} (${user.phone})` : 'Active Investigator';
    }

    // Update top header and hero history badges
    const navHistoryBadge = document.getElementById('nav-history-count');
    if (navHistoryBadge) navHistoryBadge.textContent = total;
    const heroHistoryBadge = document.getElementById('hero-history-count');
    if (heroHistoryBadge) heroHistoryBadge.textContent = total;
  }

  render() {
    if (!this.container) return;

    let filtered = this.inspections;

    // Apply prediction filter
    if (this.currentFilter === 'ai') {
      filtered = filtered.filter(i => (i.prediction || '').toUpperCase().includes('AI'));
    } else if (this.currentFilter === 'real') {
      filtered = filtered.filter(i => (i.prediction || '').toUpperCase().includes('REAL') || (i.prediction || '').toUpperCase().includes('AUTH'));
    }

    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter(i => 
        (i.image_name || '').toLowerCase().includes(this.searchQuery) ||
        (i.model_used || '').toLowerCase().includes(this.searchQuery) ||
        (i.generator_attribution || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">No Photo Inspections Recorded Yet</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Upload and analyze photos in the Studio above. Every single scan (AI-generated or Authentic) is permanently saved into your SQLite database.
          </p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(item => {
      const isAi = (item.prediction || '').toUpperCase().includes('AI');
      const confPercent = (parseFloat(item.confidence || 0) * 100).toFixed(1);
      const aiProb = (parseFloat(item.ai_probability || 0) * 100).toFixed(1);
      const realProb = (parseFloat(item.real_probability || 0) * 100).toFixed(1);
      
      const badgeClass = isAi 
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
      
      const dotColor = isAi ? 'bg-rose-500' : 'bg-emerald-500';
      const labelText = isAi ? 'AI GENERATED' : 'AUTHENTIC PHOTO';

      // Format date
      let dateStr = item.created_at;
      try {
        const d = new Date(item.created_at);
        dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {}

      // Check if image corresponds to an inspectable preset sample
      let sampleUrl = '';
      const nameLower = (item.image_name || '').toLowerCase();
      if (nameLower.includes('midjourney')) {
        sampleUrl = './assets/samples/midjourney_v5_sample.jpg';
      } else if (nameLower.includes('butterfly') || nameLower.includes('sdxl')) {
        sampleUrl = './assets/samples/sdxl_butterfly_sample.jpg';
      } else if (nameLower.includes('canon') || nameLower.includes('dslr') || nameLower.includes('sample_test') || nameLower.includes('synthetic')) {
        sampleUrl = './assets/samples/canon_dslr_sample.jpg';
      }

      return `
        <div class="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4" data-history-id="${item.id}">
          
          <div class="flex items-center gap-4">
            <div class="w-13 h-13 rounded-2xl bg-slate-100 dark:bg-slate-800/90 flex items-center justify-center flex-shrink-0 border border-slate-200/90 dark:border-slate-700 overflow-hidden shadow-sm">
              ${item.thumbnail_base64 ? `<img src="${item.thumbnail_base64}" class="w-full h-full object-cover">` : `
                <svg class="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              `}
            </div>
            
            <div class="space-y-1.5">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="font-extrabold text-sm text-slate-900 dark:text-white font-mono break-all tracking-tight">${item.image_name}</span>
                <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider border shadow-sm ${badgeClass}">
                  <span class="w-2 h-2 rounded-full ${dotColor} animate-pulse"></span> ${labelText}
                </span>
              </div>
              <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span>Model: <strong class="text-slate-700 dark:text-slate-300 font-mono">${item.model_used || 'GenImage Swin-v2'}</strong></span>
                <span>•</span>
                <span>User: <strong class="text-indigo-600 dark:text-indigo-400 font-mono">${item.user_phone || 'Guest/Demo'}</strong></span>
                <span>•</span>
                <span class="text-slate-400 font-mono">${dateStr}</span>
              </div>
            </div>
          </div>

          <!-- Metrics & Confidence -->
          <div class="flex items-center gap-4 flex-wrap md:flex-nowrap justify-between md:justify-end">
            <div class="text-right">
              <div class="text-xs font-mono font-extrabold ${isAi ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} flex items-center justify-end gap-1.5">
                <span>${confPercent}%</span> <span class="text-[10px] uppercase tracking-wider font-sans font-bold">Confidence</span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">
                <span class="text-rose-500 font-semibold">AI: ${aiProb}%</span> | <span class="text-emerald-500 font-semibold">Real: ${realProb}%</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${sampleUrl ? `
                <button type="button" onclick="if(window.closeHistoryModal){window.closeHistoryModal();} loadForensicSample('${sampleUrl}', '${item.image_name}');" class="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-all border border-blue-200/70 dark:border-blue-800 shadow-sm hover:scale-105 cursor-pointer">
                  <span>🔬</span> <span>Inspect</span>
                </button>
              ` : ''}
              <div class="px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 shadow-inner">
                ID #${item.id} (SQLite)
              </div>
            </div>
          </div>

        </div>
      `;
    }).join('');
  }
}

// Global modal helpers
window.openHistoryModal = function() {
  if (window.inspectionHistoryManager) {
    window.inspectionHistoryManager.openModal();
  }
};

window.closeHistoryModal = function() {
  if (window.inspectionHistoryManager) {
    window.inspectionHistoryManager.closeModal();
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.inspectionHistoryManager = new InspectionHistoryManager();
});
