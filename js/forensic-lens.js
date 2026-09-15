// SignalScope - Interactive Neural Forensic Lens & Live Spectrum Oscilloscope

(function() {
  class ForensicLensLab {
    constructor() {
      this.sliderPos = 50; // percentage
      this.isDragging = false;
      this.currentMode = 'fft'; // 'fft', 'prnu', 'color', 'latent'
      this.animId = null;
      this.phase = 0;

      this.presets = {
        portrait: {
          name: 'Midjourney v6 Portrait',
          isAi: true,
          realImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
          forensicFilter: 'contrast(180%) saturate(220%) hue-rotate(200deg)',
          anomaly: '+5.14σ (Diffusion Saliency Anomaly)',
          prnu: '0.11 (Non-Gaussian / Synthetic)',
          verdict: 'AI-GENERATED • Midjourney v6',
          waveColor: '#f43f5e',
          freq: 0.08,
          amp: 36
        },
        butterfly: {
          name: 'Stable Diffusion v1.5',
          isAi: true,
          realImg: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=80',
          forensicFilter: 'contrast(200%) saturate(190%) invert(20%) hue-rotate(150deg)',
          anomaly: '+4.88σ (Latent Grid Residual)',
          prnu: '0.08 (No Silicon Noise)',
          verdict: 'AI-GENERATED • SDXL v1.5',
          waveColor: '#a855f7',
          freq: 0.12,
          amp: 44
        },
        toucan: {
          name: 'Canon EOS DSLR (Authentic)',
          isAi: false,
          realImg: 'https://images.unsplash.com/photo-1550853024-fae8cd4be47f?auto=format&fit=crop&w=1000&q=80',
          forensicFilter: 'contrast(120%) saturate(130%) hue-rotate(60deg)',
          anomaly: '+0.42σ (Gaussian Natural Distribution)',
          prnu: '0.94 (Physical Sensor Matched)',
          verdict: 'AUTHENTIC PHOTO • Physical Optics',
          waveColor: '#10b981',
          freq: 0.04,
          amp: 18
        }
      };

      this.activePresetKey = 'portrait';

      this.init();
    }

    init() {
      this.container = document.getElementById('forensic-lens-container');
      this.forensicLayer = document.getElementById('forensic-lens-overlay');
      this.sliderHandle = document.getElementById('forensic-lens-handle');
      this.sliderLine = document.getElementById('forensic-lens-line');
      this.rangeInput = document.getElementById('forensic-lens-slider-range');
      this.canvas = document.getElementById('forensic-oscilloscope-canvas');
      
      if (!this.container || !this.canvas) return;

      this.ctx = this.canvas.getContext('2d');

      this.attachEvents();
      this.updateLens(50);
      this.startOscilloscope();
    }

    attachEvents() {
      // Range input for accessible smooth sliding
      if (this.rangeInput) {
        this.rangeInput.addEventListener('input', (e) => {
          this.updateLens(parseFloat(e.target.value));
        });
      }

      // Dragging on the container directly
      const handlePointerMove = (e) => {
        if (!this.isDragging) return;
        const rect = this.container.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        let x = clientX - rect.left;
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;
        const pct = (x / rect.width) * 100;
        this.updateLens(pct);
        if (this.rangeInput) this.rangeInput.value = pct;
      };

      this.container.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        handlePointerMove(e);
      });
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', () => { this.isDragging = false; });

      // Touch events
      this.container.addEventListener('touchstart', (e) => {
        this.isDragging = true;
        handlePointerMove(e);
      }, { passive: true });
      window.addEventListener('touchmove', handlePointerMove, { passive: true });
      window.addEventListener('touchend', () => { this.isDragging = false; });

      // Preset buttons
      const presetBtns = document.querySelectorAll('[data-lens-preset]');
      presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-lens-preset');
          this.setPreset(key);
          presetBtns.forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
            b.classList.add('bg-white', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
          });
          btn.classList.add('bg-blue-600', 'text-white', 'border-blue-500');
          btn.classList.remove('bg-white', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
        });
      });

      // Signal mode switchers
      const modeBtns = document.querySelectorAll('[data-signal-mode]');
      modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.currentMode = btn.getAttribute('data-signal-mode');
          modeBtns.forEach(b => {
            b.classList.remove('bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900');
            b.classList.add('bg-slate-100', 'text-slate-600', 'dark:bg-slate-800', 'dark:text-slate-400');
          });
          btn.classList.add('bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900');
          btn.classList.remove('bg-slate-100', 'text-slate-600', 'dark:bg-slate-800', 'dark:text-slate-400');
        });
      });
    }

    updateLens(pct) {
      this.sliderPos = Math.max(0, Math.min(100, pct));
      if (this.forensicLayer) {
        // Clip path reveal: clip from 0 to pct%
        this.forensicLayer.style.clipPath = `polygon(${this.sliderPos}% 0%, 100% 0%, 100% 100%, ${this.sliderPos}% 100%)`;
      }
      if (this.sliderHandle) {
        this.sliderHandle.style.left = `${this.sliderPos}%`;
      }
      if (this.sliderLine) {
        this.sliderLine.style.left = `${this.sliderPos}%`;
      }
    }

    setPreset(key) {
      const preset = this.presets[key];
      if (!preset) return;
      this.activePresetKey = key;

      const rawImg = document.getElementById('forensic-lens-raw-img');
      const overlayImg = document.getElementById('forensic-lens-overlay-img');
      const anomalyText = document.getElementById('lens-metric-anomaly');
      const prnuText = document.getElementById('lens-metric-prnu');
      const verdictText = document.getElementById('lens-metric-verdict');
      const presetLabel = document.getElementById('lens-current-preset-label');

      if (rawImg) rawImg.src = preset.realImg;
      if (overlayImg) {
        overlayImg.src = preset.realImg;
        overlayImg.style.filter = preset.forensicFilter;
      }

      if (anomalyText) anomalyText.textContent = preset.anomaly;
      if (prnuText) prnuText.textContent = preset.prnu;
      if (verdictText) {
        verdictText.textContent = preset.verdict;
        verdictText.className = preset.isAi 
          ? 'text-sm font-mono font-black text-rose-500 dark:text-rose-400' 
          : 'text-sm font-mono font-black text-emerald-500 dark:text-emerald-400';
      }
      if (presetLabel) presetLabel.textContent = preset.name;
    }

    startOscilloscope() {
      const draw = () => {
        this.renderOscilloscope();
        this.phase += 0.05;
        this.animId = requestAnimationFrame(draw);
      };
      draw();
    }

    renderOscilloscope() {
      if (!this.ctx || !this.canvas) return;
      const w = this.canvas.width = this.canvas.offsetWidth * (window.devicePixelRatio || 1);
      const h = this.canvas.height = this.canvas.offsetHeight * (window.devicePixelRatio || 1);
      const ctx = this.ctx;

      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      const gridSize = 24 * (window.devicePixelRatio || 1);
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center baseline
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const preset = this.presets[this.activePresetKey] || this.presets.portrait;
      let waveColor = preset.waveColor;
      let baseFreq = preset.freq;
      let baseAmp = preset.amp * (window.devicePixelRatio || 1);

      if (this.currentMode === 'prnu') {
        baseFreq *= 1.8;
        baseAmp *= 0.65;
        waveColor = '#06b6d4';
      } else if (this.currentMode === 'latent') {
        baseFreq *= 0.7;
        baseAmp *= 1.3;
        waveColor = '#f59e0b';
      }

      // Draw Waveform
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 2.5 * (window.devicePixelRatio || 1);
      ctx.shadowColor = waveColor;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const normX = x / w;
        // Primary sinusoidal wave + noise harmonics
        const harmonic1 = Math.sin(x * baseFreq + this.phase) * baseAmp;
        const harmonic2 = Math.sin(x * (baseFreq * 2.3) - this.phase * 1.5) * (baseAmp * 0.35);
        const noise = preset.isAi 
          ? (Math.random() - 0.5) * (baseAmp * 0.28) // High frequency synthetic noise
          : (Math.random() - 0.5) * (baseAmp * 0.08); // Clean optical Gaussian noise
        
        const y = (h / 2) + harmonic1 + harmonic2 + noise;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.forensicLensLab = new ForensicLensLab();
  });
})();
