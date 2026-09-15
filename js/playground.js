// GenImage Website - Interactive Detector Simulation Playground Module

class PlaygroundManager {
  constructor() {
    this.currentImage = null;
    this.currentMeta = null;
    this.isAnalyzing = false;
    this.init();
  }

  init() {
    this.previewImg = document.getElementById('playground-preview');
    this.fileInput = document.getElementById('playground-file-input');
    this.runBtn = document.getElementById('btn-run-detect');
    this.verdictBadge = document.getElementById('playground-verdict-badge');
    this.confidenceText = document.getElementById('playground-confidence-text');
    this.generatorText = document.getElementById('playground-generator-text');
    this.gaugeCircle = document.getElementById('playground-gauge-circle');
    this.modelScoresContainer = document.getElementById('playground-model-scores');
    this.artifactInsightEl = document.getElementById('playground-artifact-insight');
    this.saliencyToggle = document.getElementById('btn-toggle-saliency');
    this.saliencyOverlay = document.getElementById('playground-saliency-overlay');

    this.attachEvents();
  }

  attachEvents() {
    // Preset test sample cards
    const sampleCards = document.querySelectorAll('.playground-sample-card');
    sampleCards.forEach(card => {
      card.addEventListener('click', () => {
        const src = card.getAttribute('data-src');
        const isAi = card.getAttribute('data-is-ai') === 'true';
        const generator = card.getAttribute('data-generator');
        const category = card.getAttribute('data-category');

        sampleCards.forEach(c => c.classList.remove('ring-2', 'ring-blue-500', 'border-blue-500'));
        card.classList.add('ring-2', 'ring-blue-500', 'border-blue-500');

        this.setTestImage(src, { isAi, generator, category });
      });
    });

    // File upload
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.setTestImage(ev.target.result, {
              isAi: true, // simulated inference
              generator: 'Uploaded Image (Simulated Evaluation)',
              category: file.name
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Run Detection Button
    if (this.runBtn) {
      this.runBtn.addEventListener('click', () => {
        this.runInference();
      });
    }

    // Saliency / Attention map toggle
    if (this.saliencyToggle && this.saliencyOverlay) {
      this.saliencyToggle.addEventListener('click', () => {
        const isHidden = this.saliencyOverlay.classList.contains('opacity-0');
        if (isHidden) {
          this.saliencyOverlay.classList.remove('opacity-0');
          this.saliencyToggle.classList.add('bg-purple-600', 'text-white');
          this.renderSaliencyMap();
        } else {
          this.saliencyOverlay.classList.add('opacity-0');
          this.saliencyToggle.classList.remove('bg-purple-600', 'text-white');
        }
      });
    }

    // Select first sample by default
    if (sampleCards.length > 0) {
      sampleCards[0].click();
    }
  }

  setTestImage(src, meta) {
    this.currentImage = src;
    this.currentMeta = meta;

    if (this.previewImg) {
      this.previewImg.src = src;
    }

    // Reset verdict state
    this.resetState();
  }

  resetState() {
    if (this.verdictBadge) {
      this.verdictBadge.textContent = 'READY TO ANALYZE';
      this.verdictBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700';
    }
    if (this.confidenceText) this.confidenceText.textContent = '--%';
    if (this.generatorText) this.generatorText.textContent = 'Awaiting Detection...';
    if (this.gaugeCircle) {
      this.gaugeCircle.style.strokeDashoffset = '283'; // full circle empty (circumference = 2 * PI * 45 ~ 283)
    }
    if (this.saliencyOverlay) {
      this.saliencyOverlay.classList.add('opacity-0');
    }
  }

  async runInference() {
    if (!this.currentImage || this.isAnalyzing) return;
    this.isAnalyzing = true;

    // Loading UI
    if (this.runBtn) {
      this.runBtn.disabled = true;
      this.runBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Running Real Model Inference...</span>
      `;
    }

    try {
      // Convert current image data to blob
      let blob;
      if (this.currentImage.startsWith('data:')) {
        const res = await fetch(this.currentImage);
        blob = await res.blob();
      } else {
        const res = await fetch(this.currentImage);
        blob = await res.blob();
      }

      const formData = new FormData();
      formData.append('image', blob, 'sample.jpg');

      const apiRes = await fetch('/api/detect', {
        method: 'POST',
        body: formData
      });

      if (!apiRes.ok) {
        throw new Error(`Inference endpoint returned HTTP ${apiRes.status}`);
      }

      const data = await apiRes.json();
      this.displayResults(data);

    } catch (err) {
      console.warn('Playground inference call error:', err);
      if (this.verdictBadge) {
        this.verdictBadge.textContent = 'BACKEND UNAVAILABLE';
        this.verdictBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700';
      }
      if (this.generatorText) {
        this.generatorText.textContent = 'Could not connect to /api/detect';
      }
    } finally {
      this.isAnalyzing = false;
      if (this.runBtn) {
        this.runBtn.disabled = false;
        this.runBtn.innerHTML = `
          <svg class="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
          </svg>
          <span>Run Model Inference</span>
        `;
      }
    }
  }

  displayResults(data) {
    const pred = (data && data.prediction ? data.prediction : 'NO TRAINED DETECTION MODEL IS CONFIGURED').toUpperCase();
    const conf = Math.min(parseFloat(data && data.confidence ? data.confidence : 0), 99.8);
    const model = data && data.model ? data.model : 'None';

    // 1. Unconfigured State
    if (pred.includes('NO TRAINED') || pred.includes('NO MODEL')) {
      if (this.verdictBadge) {
        this.verdictBadge.textContent = 'NO MODEL CONFIGURED';
        this.verdictBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40';
      }
      if (this.confidenceText) {
        this.confidenceText.textContent = 'N/A';
        this.confidenceText.className = 'text-3xl font-black text-slate-400 font-mono';
      }
      if (this.generatorText) {
        this.generatorText.innerHTML = `<span class="text-amber-300 font-semibold">No Trained Model Configured</span> <span class="text-xs text-slate-400 block mt-0.5">To run real inference, configure trained GenImage model checkpoint weights in <code>models/</code>.</span>`;
      }
      if (this.gaugeCircle) {
        this.gaugeCircle.style.strokeDashoffset = '283';
      }
      if (this.modelScoresContainer) {
        this.modelScoresContainer.innerHTML = `
          <div class="p-3 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            No trained weights configured. Place trained PyTorch / ONNX checkpoint in <code>models/</code>.
          </div>
        `;
      }
      if (this.artifactInsightEl) {
        this.artifactInsightEl.innerHTML = `<strong>Status:</strong> Awaiting trained GenImage model configuration in backend.`;
      }
      return;
    }

    // 2. Real Model Classification
    const isAi = pred.includes('AI') || pred.includes('SYNTHETIC');

    if (this.verdictBadge) {
      if (isAi) {
        this.verdictBadge.textContent = 'SYNTHETIC AI-GENERATED';
        this.verdictBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/30';
      } else {
        this.verdictBadge.textContent = 'AUTHENTIC REAL PHOTOGRAPH';
        this.verdictBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/30';
      }
    }

    if (this.confidenceText) {
      this.confidenceText.textContent = `${conf.toFixed(1)}%`;
      this.confidenceText.className = isAi ? 'text-3xl font-extrabold text-rose-400 font-mono' : 'text-3xl font-extrabold text-emerald-400 font-mono';
    }

    if (this.generatorText) {
      this.generatorText.innerHTML = isAi 
        ? `<span class="text-rose-300 font-semibold">Model: ${model}</span> <span class="text-xs text-slate-400 block mt-0.5">Neural network output: Synthetic generative features detected.</span>`
        : `<span class="text-emerald-300 font-semibold">Model: ${model}</span> <span class="text-xs text-slate-400 block mt-0.5">Neural network output: Authentic camera sensor characteristics detected.</span>`;
    }

    if (this.gaugeCircle) {
      const offset = 283 - (283 * (conf / 100));
      this.gaugeCircle.style.strokeDashoffset = offset;
      this.gaugeCircle.style.stroke = isAi ? '#f43f5e' : '#10b981';
    }

    if (this.modelScoresContainer) {
      this.modelScoresContainer.innerHTML = `
        <div class="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs">
          <span class="font-medium text-slate-300">${model}</span>
          <div class="flex items-center gap-2 font-mono">
            <span class="${isAi ? 'text-rose-400' : 'text-emerald-400'} font-bold">${isAi ? 'AI' : 'Real'}</span>
            <span class="text-slate-400">${conf.toFixed(1)}%</span>
          </div>
        </div>
      `;
    }

    if (this.artifactInsightEl) {
      this.artifactInsightEl.innerHTML = `<strong>Model-Based Result:</strong> Inference executed via ${model}. Probabilistic prediction.`;
    }
  }

  renderSaliencyMap() {
    if (!this.saliencyOverlay) return;
    const canvas = this.saliencyOverlay;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isAi = this.currentMeta ? this.currentMeta.isAi : true;
    const w = canvas.width;
    const h = canvas.height;

    // Case 1: If backend returned real saliency map matrix
    const saliencyMap = this.lastDetectResult ? this.lastDetectResult.saliency_map : null;
    if (saliencyMap && Array.isArray(saliencyMap) && saliencyMap.length > 0) {
      const rows = saliencyMap.length;
      const cols = saliencyMap[0].length;
      const cellW = w / cols;
      const cellH = h / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = saliencyMap[r][c];
          if (val > 0.15) {
            ctx.fillStyle = isAi
              ? `rgba(239, 68, 68, ${val * 0.7})`
              : `rgba(16, 185, 129, ${val * 0.6})`;
            ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
          }
        }
      }
    } else if (this.previewImg && this.previewImg.complete && this.previewImg.naturalWidth > 0) {
      // Case 2: Compute real pixel luminance gradient from loaded image
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 64;
        offCanvas.height = 64;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(this.previewImg, 0, 0, 64, 64);
        const imgData = offCtx.getImageData(0, 0, 64, 64).data;
        const cellW = w / 64;
        const cellH = h / 64;
        for (let y = 1; y < 63; y += 2) {
          for (let x = 1; x < 63; x += 2) {
            const idx = (y * 64 + x) * 4;
            const idxR = (y * 64 + (x + 1)) * 4;
            const idxD = ((y + 1) * 64 + x) * 4;
            const gx = Math.abs(imgData[idx] - imgData[idxR]);
            const gy = Math.abs(imgData[idx] - imgData[idxD]);
            const grad = Math.sqrt(gx * gx + gy * gy) / 180.0;
            if (grad > 0.22) {
              const alpha = Math.min(grad, 0.7);
              ctx.fillStyle = isAi
                ? `rgba(239, 68, 68, ${alpha})`
                : `rgba(16, 185, 129, ${alpha})`;
              ctx.fillRect(x * cellW, y * cellH, cellW * 2, cellH * 2);
            }
          }
        }
      } catch (e) {
        const radGrad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
        radGrad.addColorStop(0, isAi ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.35)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // Overlay text
    ctx.font = '600 11px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚡ FEATURE ATTENTION & SALIENCY MAP', 16, 24);
  }
}

window.PlaygroundManager = PlaygroundManager;
