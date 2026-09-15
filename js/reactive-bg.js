/**
 * SignalScope - Interactive Reactive Neural Background
 * 60+ FPS Hardware-accelerated dynamic particle lattice, holographic energy field,
 * and mouse-reactive forensic filaments.
 */

(function() {
  'use strict';

  class ReactiveNeuralBackground {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.particles = [];
      this.particleCount = window.innerWidth < 768 ? 42 : 85;
      this.connectionDistance = window.innerWidth < 768 ? 110 : 155;

      this.mouse = {
        x: -9999,
        y: -9999,
        targetX: -9999,
        targetY: -9999,
        active: false,
        radius: 200,
        energy: 0
      };

      this.ripples = [];
      this.isDark = document.documentElement.classList.contains('dark');
      this.animId = null;

      this.init();
    }

    init() {
      // Find or create canvas
      this.canvas = document.getElementById('reactive-bg-canvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'reactive-bg-canvas';
        this.canvas.className = 'fixed inset-0 pointer-events-none z-0 transition-opacity duration-700';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        document.body.insertBefore(this.canvas, document.body.firstChild);
      }

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.resize();

      this.createParticles();
      this.attachEvents();
      this.startAnimation();
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.scale(this.dpr, this.dpr);
    }

    createParticles() {
      this.particles = [];
      const count = this.particleCount;

      for (let i = 0; i < count; i++) {
        const isSpecial = Math.random() < 0.22; // 22% are glowing hub nodes
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.75,
          vy: (Math.random() - 0.5) * 0.75,
          baseRadius: isSpecial ? (Math.random() * 2.2 + 2.5) : (Math.random() * 1.5 + 1.2),
          radius: isSpecial ? 3.5 : 2,
          isSpecial: isSpecial,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03,
          colorType: Math.random() < 0.4 ? 'cyan' : (Math.random() < 0.7 ? 'purple' : 'emerald')
        });
      }
    }

    attachEvents() {
      window.addEventListener('resize', () => {
        this.resize();
        this.createParticles();
      }, { passive: true });

      window.addEventListener('mousemove', (e) => {
        if (e.target && e.target.closest && e.target.closest('#visualizer')) {
          this.mouse.active = false;
          return;
        }
        this.mouse.targetX = e.clientX;
        this.mouse.targetY = e.clientY;
        this.mouse.active = true;
        this.mouse.energy = Math.min(this.mouse.energy + 0.15, 1);
      }, { passive: true });

      window.addEventListener('mouseleave', () => {
        this.mouse.active = false;
      });

      window.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('#visualizer')) {
          return;
        }
        this.createRipple(e.clientX, e.clientY);
      }, { passive: true });

      // Theme toggle observer
      const observer = new MutationObserver(() => {
        this.isDark = document.documentElement.classList.contains('dark');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    createRipple(x, y) {
      this.ripples.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 280,
        alpha: 0.7,
        speed: 7
      });
    }

    startAnimation() {
      const loop = () => {
        this.render();
        this.animId = requestAnimationFrame(loop);
      };
      loop();
    }

    render() {
      const ctx = this.ctx;
      if (!ctx) return;

      ctx.clearRect(0, 0, this.width, this.height);

      // Smooth mouse cursor interpolation
      if (this.mouse.active) {
        this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.14;
        this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.14;
        this.mouse.energy = Math.max(0, this.mouse.energy - 0.015);
      } else {
        this.mouse.x += (-9999 - this.mouse.x) * 0.05;
        this.mouse.y += (-9999 - this.mouse.y) * 0.05;
        this.mouse.energy = Math.max(0, this.mouse.energy - 0.02);
      }

      // 1. Draw Ambient Cursor Aura (Glow orb following pointer)
      if (this.mouse.active && this.mouse.x > 0 && this.mouse.y > 0) {
        const auraGradient = ctx.createRadialGradient(
          this.mouse.x, this.mouse.y, 0,
          this.mouse.x, this.mouse.y, this.mouse.radius
        );
        if (this.isDark) {
          auraGradient.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
          auraGradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.08)');
          auraGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
        } else {
          auraGradient.addColorStop(0, 'rgba(37, 99, 235, 0.12)');
          auraGradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.06)');
          auraGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(this.mouse.x, this.mouse.y, this.mouse.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Process Ripples
      for (let r = this.ripples.length - 1; r >= 0; r--) {
        const rip = this.ripples[r];
        rip.radius += rip.speed;
        rip.alpha -= 0.018;

        if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
          this.ripples.splice(r, 1);
          continue;
        }

        ctx.strokeStyle = this.isDark 
          ? `rgba(56, 189, 248, ${rip.alpha * 0.7})` 
          : `rgba(99, 102, 241, ${rip.alpha * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Update and Draw Particles
      const particles = this.particles;
      const count = particles.length;

      for (let i = 0; i < count; i++) {
        const p = particles[i];

        // Normal drift
        p.x += p.vx;
        p.y += p.vy;

        // Screen boundary wrap
        if (p.x < -20) p.x = this.width + 20;
        if (p.x > this.width + 20) p.x = -20;
        if (p.y < -20) p.y = this.height + 20;
        if (p.y > this.height + 20) p.y = -20;

        // Interactive mouse physics (Gentle gravitational vortex & repulsion)
        if (this.mouse.active) {
          const dx = this.mouse.x - p.x;
          const dy = this.mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < this.mouse.radius && dist > 1) {
            const force = (1 - dist / this.mouse.radius);
            // Swirl + push away slightly
            const angle = Math.atan2(dy, dx);
            p.x -= Math.cos(angle) * force * 1.6;
            p.y -= Math.sin(angle) * force * 1.6;
            p.x += -Math.sin(angle) * force * 0.8;
            p.y += Math.cos(angle) * force * 0.8;
          }
        }

        // Pulsing radius
        p.phase += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.phase) * (p.isSpecial ? 1.4 : 0.6);

        // Particle colors
        let baseColor = '';
        if (this.isDark) {
          if (p.colorType === 'cyan') baseColor = 'rgba(56, 189, 248, ';
          else if (p.colorType === 'purple') baseColor = 'rgba(168, 85, 247, ';
          else baseColor = 'rgba(52, 211, 153, ';
        } else {
          if (p.colorType === 'cyan') baseColor = 'rgba(2, 132, 199, ';
          else if (p.colorType === 'purple') baseColor = 'rgba(124, 58, 237, ';
          else baseColor = 'rgba(16, 185, 129, ';
        }

        const alpha = p.isSpecial 
          ? (this.isDark ? 0.85 : 0.65) 
          : (this.isDark ? 0.45 : 0.35);

        // Glow halo on special hub particles
        if (p.isSpecial) {
          ctx.shadowColor = baseColor + '0.9)';
          ctx.shadowBlur = this.isDark ? 14 : 8;
        }

        ctx.fillStyle = baseColor + alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // reset
      }

      // 4. Draw Inter-Particle Neural Connections
      const maxDist = this.connectionDistance;
      const maxDistSq = maxDist * maxDist;

      for (let i = 0; i < count; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < count; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxDist) * (this.isDark ? 0.28 : 0.18);

            ctx.strokeStyle = this.isDark
              ? `rgba(147, 197, 253, ${lineAlpha})`
              : `rgba(99, 102, 241, ${lineAlpha})`;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // 5. Draw Interactive Laser Beam Connections to Mouse
        if (this.mouse.active) {
          const mdx = this.mouse.x - p1.x;
          const mdy = this.mouse.y - p1.y;
          const mdistSq = mdx * mdx + mdy * mdy;
          const mRadiusSq = this.mouse.radius * this.mouse.radius;

          if (mdistSq < mRadiusSq) {
            const mdist = Math.sqrt(mdistSq);
            const mAlpha = (1 - mdist / this.mouse.radius) * (this.isDark ? 0.45 : 0.32);

            ctx.strokeStyle = this.isDark
              ? `rgba(56, 189, 248, ${mAlpha})`
              : `rgba(37, 99, 235, ${mAlpha})`;
            ctx.lineWidth = 1.3;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(this.mouse.x, this.mouse.y);
            ctx.stroke();
          }
        }
      }
    }
  }

  // Instantiate on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.reactiveNeuralBackground = new ReactiveNeuralBackground();
    });
  } else {
    window.reactiveNeuralBackground = new ReactiveNeuralBackground();
  }
})();
