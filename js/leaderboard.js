// GenImage Website - Benchmark Leaderboard, Heatmap & Multi-Mode Graph/Chart Module

class LeaderboardManager {
  constructor(data) {
    this.data = data || {};
    this.currentTab = 'sd14'; // 'sd14' | 'cross' | 'degrade'
    this.sortColumn = 'avg';
    this.sortAsc = false;
    this.chartMode = 'combo'; // 'combo' | 'line' | 'bar'
    this.chartInstance = null;

    this.init();
  }

  init() {
    this.attachTabEvents();
    this.attachChartModeEvents();
    this.attachThemeObserver();
    this.renderCurrentTable();
    this.initChart();
  }

  attachTabEvents() {
    const tabs = [
      { id: 'tab-sd14', value: 'sd14' },
      { id: 'tab-cross', value: 'cross' },
      { id: 'tab-degrade', value: 'degrade' }
    ];

    tabs.forEach(t => {
      const el = document.getElementById(t.id);
      if (!el) return;
      el.addEventListener('click', () => {
        this.currentTab = t.value;
        this.sortColumn = 'avg';
        this.sortAsc = false;

        // Update tab styling without hardcoding dark mode in light mode
        tabs.forEach(item => {
          const btn = document.getElementById(item.id);
          if (btn) {
            if (item.value === this.currentTab) {
              btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-sm transition-all';
            } else {
              btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
            }
          }
        });

        this.renderCurrentTable();
        this.updateChart();
      });
    });
  }

  attachChartModeEvents() {
    const modes = [
      { id: 'chart-mode-combo', mode: 'combo' },
      { id: 'chart-mode-line', mode: 'line' },
      { id: 'chart-mode-bar', mode: 'bar' }
    ];

    modes.forEach(m => {
      const btn = document.getElementById(m.id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        this.chartMode = m.mode;
        
        // Update button visual styles
        modes.forEach(item => {
          const b = document.getElementById(item.id);
          if (b) {
            if (item.mode === this.chartMode) {
              b.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs cursor-pointer';
            } else {
              b.className = 'px-2.5 py-1 rounded-lg text-xs font-medium transition-all text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer';
            }
          }
        });

        // Update tag and subtext
        const tag = document.getElementById('chart-active-tag');
        const subtext = document.getElementById('chart-subtext');
        if (this.chartMode === 'combo') {
          if (tag) tag.textContent = 'Dual-Axis Combo';
          if (subtext) subtext.innerHTML = 'Bars show Average Model Accuracy &bull; The Line Graph tracks Hardest Unseen-Generator Generalization.';
        } else if (this.chartMode === 'line') {
          if (tag) tag.textContent = 'Line Graph View';
          if (subtext) subtext.innerHTML = 'Smooth spline curves comparing Model Average Accuracy vs Unseen Generator Transfer across architectures.';
        } else {
          if (tag) tag.textContent = 'Bar Chart View';
          if (subtext) subtext.innerHTML = 'Direct comparative bars across evaluated neural detectors on held-out test benchmarks.';
        }

        this.updateChart();
      });
    });
  }

  attachThemeObserver() {
    // Re-render chart when theme switches between light and dark
    const observer = new MutationObserver(() => {
      if (this.chartInstance) {
        this.applyThemeToChart();
        this.chartInstance.update();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('theme-changed', () => {
      if (this.chartInstance) {
        this.applyThemeToChart();
        this.chartInstance.update();
      }
    });
  }

  getColorForScore(val) {
    // High-visibility dual-mode color combinations (100% readable text in light and dark mode)
    if (val >= 95.0) {
      // In-Domain / Near Perfect
      return 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700';
    }
    if (val >= 75.0) {
      // Strong Unseen Transfer
      return 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700';
    }
    if (val >= 65.0) {
      // Moderate Transfer
      return 'bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700';
    }
    if (val >= 55.0) {
      // Degraded Transfer
      return 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700';
    }
    // Poor Transfer / Random Chance (< 55%)
    return 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700';
  }

  renderCurrentTable() {
    const tableContainer = document.getElementById('leaderboard-table-container');
    if (!tableContainer) return;

    if (this.currentTab === 'sd14') {
      this.renderSD14Table(tableContainer);
    } else if (this.currentTab === 'cross') {
      this.renderCrossTable(tableContainer);
    } else if (this.currentTab === 'degrade') {
      this.renderDegradeTable(tableContainer);
    }
  }

  renderSD14Table(container) {
    const list = [...(this.data.table3_sd14 || [])];
    list.sort((a, b) => {
      const vA = a[this.sortColumn] ?? 0;
      const vB = b[this.sortColumn] ?? 0;
      return this.sortAsc ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    const headers = [
      { key: 'method', label: 'Detection Method' },
      { key: 'midjourney', label: 'Midjourney (Unseen)' },
      { key: 'sd14', label: 'SD v1.4 (In-domain)' },
      { key: 'sd15', label: 'SD v1.5' },
      { key: 'adm', label: 'ADM' },
      { key: 'glide', label: 'GLIDE' },
      { key: 'wukong', label: 'Wukong' },
      { key: 'vqdm', label: 'VQDM' },
      { key: 'biggan', label: 'BigGAN' },
      { key: 'avg', label: 'Avg Acc. (%)' }
    ];

    let html = `
      <div class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr class="border-b-2 border-slate-200 bg-slate-100/90 text-slate-800 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200">
                ${headers.map(h => `
                  <th class="p-3 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap" onclick="window.leaderboardManager.handleSort('${h.key}')">
                    <div class="flex items-center gap-1.5">
                      <span>${h.label}</span>
                      <span class="text-xs opacity-60 font-mono text-blue-600 dark:text-blue-400">${this.sortColumn === h.key ? (this.sortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
    `;

    list.forEach(row => {
      const isSota = row.method.includes('GenDet') || row.avg > 80;
      const rowClass = isSota 
        ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 dark:from-indigo-950/45 dark:via-purple-950/30 dark:to-blue-950/40 border-l-4 border-l-indigo-600 dark:border-l-indigo-400 font-semibold shadow-2xs' 
        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors';

      html += `
        <tr class="${rowClass}">
          <td class="p-3 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 dark:text-white tracking-tight">${row.method}</span>
              ${row.method.includes('GenDet') ? '<span class="badge-sota">SOTA</span>' : ''}
            </div>
          </td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.midjourney)}">${row.midjourney.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.sd14)}">${row.sd14.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.sd15)}">${row.sd15.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.adm)}">${row.adm.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.glide)}">${row.glide.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.wukong)}">${row.wukong.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.vqdm)}">${row.vqdm.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.biggan)}">${row.biggan.toFixed(1)}%</span></td>
          <td class="p-2.5">
            ${isSota ? `
              <span class="px-3.5 py-1 rounded-full font-black text-xs font-mono inline-block bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md ring-2 ring-indigo-400/30">${row.avg.toFixed(1)}%</span>
            ` : `
              <span class="px-3 py-1 rounded-full font-extrabold text-xs font-mono inline-block bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm border border-slate-700 dark:border-blue-500">${row.avg.toFixed(1)}%</span>
            `}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
        <!-- High-contrast Color Key & Citation -->
        <div class="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <span class="font-medium text-[11px] text-slate-500 dark:text-slate-400">
            * Evaluated in Table 3 of the paper: Detectors trained exclusively on SD v1.4 and tested against unseen generators.
          </span>
          <div class="flex items-center gap-2 flex-wrap font-bold text-[11px]">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700">
              <span class="w-2 h-2 rounded-full bg-emerald-600"></span> ≥95% (In-domain)
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700">
              <span class="w-2 h-2 rounded-full bg-sky-600"></span> 75–94% (Strong)
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700">
              <span class="w-2 h-2 rounded-full bg-indigo-600"></span> 65–74% (Moderate)
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700">
              <span class="w-2 h-2 rounded-full bg-amber-600"></span> 55–64% (Degraded)
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700">
              <span class="w-2 h-2 rounded-full bg-rose-600"></span> &lt;55% (Poor Transfer)
            </span>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  renderCrossTable(container) {
    const list = [...(this.data.table4_cross_val || [])];
    list.sort((a, b) => {
      const vA = a[this.sortColumn] ?? 0;
      const vB = b[this.sortColumn] ?? 0;
      return this.sortAsc ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    const headers = [
      { key: 'method', label: 'Detection Method' },
      { key: 'midjourney', label: 'Midjourney' },
      { key: 'sd14', label: 'SD v1.4' },
      { key: 'sd15', label: 'SD v1.5' },
      { key: 'adm', label: 'ADM' },
      { key: 'glide', label: 'GLIDE' },
      { key: 'wukong', label: 'Wukong' },
      { key: 'vqdm', label: 'VQDM' },
      { key: 'biggan', label: 'BigGAN' },
      { key: 'avg', label: 'Cross Avg. (%)' }
    ];

    let html = `
      <div class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr class="border-b-2 border-slate-200 bg-slate-100/90 text-slate-800 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200">
                ${headers.map(h => `
                  <th class="p-3 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap" onclick="window.leaderboardManager.handleSort('${h.key}')">
                    <div class="flex items-center gap-1.5">
                      <span>${h.label}</span>
                      <span class="text-xs opacity-60 font-mono text-blue-600 dark:text-blue-400">${this.sortColumn === h.key ? (this.sortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
    `;

    list.forEach(row => {
      const isTop = row.avg >= 70;
      html += `
        <tr class="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors ${isTop ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}">
          <td class="p-3 whitespace-nowrap">
            <span class="font-bold text-slate-900 dark:text-white tracking-tight">${row.method}</span>
          </td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.midjourney)}">${row.midjourney.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.sd14)}">${row.sd14.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.sd15)}">${row.sd15.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.adm)}">${row.adm.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.glide)}">${row.glide.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.wukong)}">${row.wukong.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.vqdm)}">${row.vqdm.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.biggan)}">${row.biggan.toFixed(1)}%</span></td>
          <td class="p-2.5">
            <span class="px-3 py-1 rounded-full font-extrabold text-xs font-mono inline-block bg-slate-900 text-white dark:bg-purple-600 dark:text-white shadow-sm border border-slate-700 dark:border-purple-500">${row.avg.toFixed(1)}%</span>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
        <div class="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          * Evaluated in Table 4 of the paper: Eight models trained on eight individual generators are tested on each generator subset, yielding the cross-validation generalization matrix.
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  renderDegradeTable(container) {
    const list = [...(this.data.table5_degradation || [])];
    list.sort((a, b) => {
      const vA = a[this.sortColumn] ?? 0;
      const vB = b[this.sortColumn] ?? 0;
      return this.sortAsc ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    const headers = [
      { key: 'method', label: 'Detection Method' },
      { key: 'lr112', label: 'Low-Res (112)' },
      { key: 'lr64', label: 'Low-Res (64)' },
      { key: 'jpeg65', label: 'JPEG (q=65)' },
      { key: 'jpeg30', label: 'JPEG (q=30)' },
      { key: 'blur3', label: 'Blur (σ=3)' },
      { key: 'blur5', label: 'Blur (σ=5)' },
      { key: 'avg', label: 'Robust Avg. (%)' }
    ];

    let html = `
      <div class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr class="border-b-2 border-slate-200 bg-slate-100/90 text-slate-800 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200">
                ${headers.map(h => `
                  <th class="p-3 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap" onclick="window.leaderboardManager.handleSort('${h.key}')">
                    <div class="flex items-center gap-1.5">
                      <span>${h.label}</span>
                      <span class="text-xs opacity-60 font-mono text-blue-600 dark:text-blue-400">${this.sortColumn === h.key ? (this.sortAsc ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
    `;

    list.forEach(row => {
      const isTop = row.avg >= 80;
      html += `
        <tr class="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors ${isTop ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''}">
          <td class="p-3 whitespace-nowrap">
            <span class="font-bold text-slate-900 dark:text-white tracking-tight">${row.method}</span>
          </td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.lr112)}">${row.lr112.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.lr64)}">${row.lr64.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.jpeg65)}">${row.jpeg65.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.jpeg30)}">${row.jpeg30.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.blur3)}">${row.blur3.toFixed(1)}%</span></td>
          <td class="p-2.5"><span class="leaderboard-score-pill px-2.5 py-1 rounded-md border text-xs font-mono font-bold inline-block ${this.getColorForScore(row.blur5)}">${row.blur5.toFixed(1)}%</span></td>
          <td class="p-2.5">
            <span class="px-3 py-1 rounded-full font-extrabold text-xs font-mono inline-block bg-slate-900 text-white dark:bg-teal-600 dark:text-white shadow-sm border border-slate-700 dark:border-teal-500">${row.avg.toFixed(1)}%</span>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
        <div class="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          * Evaluated in Table 5 of the paper: Robustness assessment on degraded synthetic images with downsampling, lossy JPEG compression, and Gaussian blurring.
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  handleSort(columnKey) {
    if (this.sortColumn === columnKey) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = columnKey;
      this.sortAsc = false;
    }
    this.renderCurrentTable();
  }

  getChartThemeConfig() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      textColor: isDark ? '#cbd5e1' : '#0f172a',
      subtextColor: isDark ? '#94a3b8' : '#334155',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)',
      tooltipBg: '#0f172a',
      tooltipBorder: isDark ? '#334155' : '#1e293b'
    };
  }

  applyThemeToChart() {
    if (!this.chartInstance) return;
    const theme = this.getChartThemeConfig();
    this.chartInstance.options.scales.y.grid.color = theme.gridColor;
    this.chartInstance.options.scales.y.ticks.color = theme.subtextColor;
    this.chartInstance.options.scales.x.ticks.color = theme.textColor;
    this.chartInstance.options.plugins.legend.labels.color = theme.textColor;
  }

  initChart() {
    const canvas = document.getElementById('benchmark-chart');
    if (!canvas || !window.Chart) return;

    const theme = this.getChartThemeConfig();
    const ctx = canvas.getContext('2d');

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            min: 40,
            max: 105,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.subtextColor,
              font: { family: 'JetBrains Mono', weight: '600' },
              callback: (value) => `${value}%`
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: theme.textColor,
              font: { weight: 700, family: 'Inter' }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: theme.textColor,
              font: { family: 'Inter', weight: '600', size: 12 },
              usePointStyle: true,
              boxWidth: 10,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: theme.tooltipBorder,
            borderWidth: 1.5,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { size: 13, weight: 'bold', family: 'Inter' },
            bodyFont: { size: 12, family: 'JetBrains Mono' },
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
            }
          }
        }
      }
    });

    this.updateChart();
  }

  updateChart() {
    if (!this.chartInstance) return;

    let items = [];
    let lineLabel = '';
    let barLabel = '';

    if (this.currentTab === 'sd14') {
      items = [...(this.data.table3_sd14 || [])];
      barLabel = 'Average Detection Accuracy (%)';
      lineLabel = 'Unseen Midjourney Transfer Curve (%)';
    } else if (this.currentTab === 'cross') {
      items = [...(this.data.table4_cross_val || [])];
      barLabel = 'Cross-Generator Average (%)';
      lineLabel = 'Unseen Midjourney Benchmark (%)';
    } else if (this.currentTab === 'degrade') {
      items = [...(this.data.table5_degradation || [])];
      barLabel = 'Degraded Robustness Average (%)';
      lineLabel = 'Severe Blur (σ=5) Robustness (%)';
    }

    const labels = items.map(d => d.method);
    const avgScores = items.map(d => d.avg);
    const lineScores = items.map(d => {
      if (this.currentTab === 'sd14' || this.currentTab === 'cross') return d.midjourney;
      if (this.currentTab === 'degrade') return d.blur5;
      return d.avg;
    });

    // Generate bar colors: Royal Blue for baseline, Neon Violet for SOTA GenDet
    const barBackgrounds = labels.map(m => 
      m.includes('GenDet') ? 'rgba(124, 58, 237, 0.88)' : 'rgba(37, 99, 235, 0.82)'
    );
    const barBorders = labels.map(m => 
      m.includes('GenDet') ? '#7c3aed' : '#2563eb'
    );

    // Configure Datasets based on this.chartMode
    const datasets = [];

    // Line Graph Dataset (Generalization Curve / Benchmark Line)
    const lineDataset = {
      type: 'line',
      label: lineLabel,
      data: lineScores,
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236, 72, 153, 0.12)',
      borderWidth: 3,
      tension: 0.38,
      fill: this.chartMode === 'line',
      pointBackgroundColor: '#ec4899',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 9,
      order: 1
    };

    // Bar Dataset (Average Accuracy)
    const barDataset = {
      type: 'bar',
      label: barLabel,
      data: avgScores,
      backgroundColor: barBackgrounds,
      borderColor: barBorders,
      borderWidth: 1.5,
      borderRadius: { topLeft: 6, topRight: 6 },
      order: 2
    };

    if (this.chartMode === 'combo') {
      datasets.push(lineDataset);
      datasets.push(barDataset);
    } else if (this.chartMode === 'line') {
      const avgLineDataset = {
        type: 'line',
        label: barLabel + ' (Curve)',
        data: avgScores,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.10)',
        borderWidth: 3,
        tension: 0.38,
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 9
      };
      datasets.push(avgLineDataset);
      datasets.push(lineDataset);
    } else {
      // Bar only
      datasets.push(barDataset);
    }

    this.chartInstance.data.labels = labels;
    this.chartInstance.data.datasets = datasets;
    this.applyThemeToChart();
    this.chartInstance.update();
  }
}

window.LeaderboardManager = LeaderboardManager;
