# SignalScope Engineering Limitations & Failure Mode Analysis

> **Compliance**: Responsible AI & Ethical Disclosure (SIH Problem Statement Section 1)  
> **Target Audience**: Judges, Forensic Auditors, Fact-Checkers

---

## 1. Probabilistic Nature of Detection
- **Non-Proof of Authenticity**: AI detection operates on statistical pattern recognition and frequency anomalies. A model output of $p_{\text{ai}} = 0.88$ represents a high probabilistic likelihood of synthetic origin, **not cryptographic or legal proof**.
- **Human-in-the-Loop Requirement**: High-stakes content moderation and legal evidence workflows must use SignalScope predictions as supporting corroboration alongside human journalistic verification.

---

## 2. Severe Social Media Re-Compression (JPEG Quality < 20)
- **Failure Mode**: Multi-hop compression (e.g. forward-chaining through WhatsApp $\to$ Twitter $\to$ Reddit) aggressively quantizes high-frequency DCT coefficients.
- **Impact**: High-frequency 2D-FFT artifact peaks can be suppressed, causing false negatives ($FNR = 47.62\%$ on extreme corruptions).
- **Mitigation**: SignalScope incorporates the $\pm 8\%$ uncertainty band. Heavily degraded assets route to `UNCERTAIN` rather than giving false high-confidence verdicts.

---

## 3. Ultra-Low Resolution Assets (< 64×64 pixels)
- **Failure Mode**: Downscaled thumbnails eliminate micro-texture transitions and sensor noise patterns.
- **Impact**: The vision transformer must interpolate missing spatial tokens, increasing ambiguity.
- **Enforced Safety Guard**: The backend strictly rejects images below $16 \times 16$ pixels with an explicit HTTP 400 error.

---

## 4. Unseen Generative Architectures
- **The Generalization Gap**: Detectors trained exclusively on SD 1.5 or Midjourney v4 show performance degradation when confronted with fundamentally novel generative paradigms (e.g. Autoregressive Diffusion or continuous-time flow matching).
- **Mitigation**: SignalScope's tri-modal architecture relies on physical optics (PRNU noise, optical depth-of-field, 2D-FFT residuals) that remain universal across generative paradigms.

---

## 5. Metadata & Provenance Fragility
- **C2PA Stripping**: Over 95% of images circulating on modern social media platforms have EXIF and C2PA metadata stripped during server-side ingest.
- **Policy Enforcement**: SignalScope never treats missing metadata as proof of AI generation. Provenance is strictly an independent verification channel.

---

## 6. Adversarial Evasion & Anti-Forensics
- **Known Threat**: Sophisticated bad actors can add synthetic camera sensor noise (PRNU spoofing) or apply targeted adversarial perturbations ($L_\infty \le 8/255$) to artificially reduce $p_{\text{ai}}$.
- **Mitigation**: Multi-signal cross-verification (if spatial features say Real but 2D-FFT shows synthetic periodic spikes, ambiguity is flagged).
