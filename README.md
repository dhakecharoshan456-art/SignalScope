# SignalScope: Multimodal AI-Generated Media Forensics Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-ee4c2c.svg)](https://pytorch.org/)
[![Transformers](https://img.shields.io/badge/HuggingFace-Swin--v2-yellow.svg)](https://huggingface.co/)
[![Database](https://img.shields.io/badge/Database-SQLite3%20WAL-003B57.svg)](https://sqlite.org/)
[![SIH](https://img.shields.io/badge/Competition-SIH%202026-brightgreen.svg)]()

> **Problem Statement**: SignalScope — AI-Generated Media Forensics, Provenance & Explanation Engine  
> **Core Focus**: Held-Out Generalization, Unseen-Generator Detection, Calibrated Confidence, Explainability, and Provenance.

---

## Table of Contents

1. [Problem](#problem)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Production Model](#production-model)
5. [Installation](#installation)
6. [Run](#run)
7. [Test One Image](#test-one-image)
8. [Run Evaluation](#run-evaluation)
9. [Metrics](#metrics)
10. [Explanation](#explanation)
11. [Generator Attribution](#generator-attribution)
12. [Robustness](#robustness)
13. [C2PA / EXIF](#c2pa--exif)
14. [Limitations](#limitations)
15. [Project Structure](#project-structure)
16. [Reproducibility](#reproducibility)

---

## Problem

Modern generative diffusion models (Stable Diffusion, Midjourney, DALL-E 3, Flux) and GANs produce synthetic imagery with photorealistic quality, rendering visual inspection insufficient for fact-checkers, newsrooms, and law enforcement. 

Most conventional detectors suffer from two critical vulnerabilities:
1. **The Generalization Gap**: They overfit to known training generators and collapse when evaluated against **unseen generators** in held-out splits.
2. **Compression Vulnerability**: Social media platforms re-compress imagery, stripping high-frequency generator artifacts and causing false classifications.

SignalScope addresses these challenges with a tri-modal forensic architecture combining deep vision transformer features, spatial-frequency 2D-FFT residuals, sensor noise verification (PRNU), and C2PA provenance tracking.

---

## Features

- **Production Deep Vision Backbone**: Swin-v2 Transformer (`umm-maybe/AI-image-detector`) outputting continuous $p_{\text{ai}} \in [0, 1]$.
- **Calibrated Uncertainty Safeguard**: Decision threshold at 0.50 with a $\pm 8\%$ safety band ($0.42 \le p_{\text{ai}} \le 0.58$) to withhold false accusations on ambiguous images.
- **Genuine Model-Guided Saliency**: $32 \times 32$ spatial feature gradient matrix rendered dynamically on the uploaded image.
- **Evidence-Based Explanations**: Derived from real calculated 2D-FFT radial ratios, Laplacian noise variance, and Sobel spatial texture energy.
- **Dynamic Perturbation Robustness**: Real-time `/api/robustness-test` measuring prediction stability against JPEG Q=50, 50% downscaling, display noise, and center cropping.
- **Provenance & C2PA Metadata**: Explicit three-tier status (Manifest Not Detected / Manifest Present / Cryptographically Verified) fused with visual evidence.
- **Enterprise Batch Scanner**: Concurrent multi-file upload with queue processing and JSON export.
- **Persistent SQLite Audit Trail**: Immutable scan logs with WAL mode concurrency for enterprise fact-checking workflows.

---

## Architecture

```
                                      UPLOADED IMAGE
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
                Spatial Backbone       2D-FFT Spectrum       Laplacian Noise
               (Swin-v2 Transformer)  (Radial HF/LF Ratio)   (PRNU Sensor Shot)
                       │                     │                     │
                       └─────────────────────┼─────────────────────┘
                                             ▼
                                  Multi-Signal Calibration
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
                   LIKELY REAL           UNCERTAIN       LIKELY AI-GENERATED
                 (p_ai < 0.42)       (0.42 <= p <= 0.58)     (p_ai > 0.58)
                        │                    │                    │
                        └────────────────────┼────────────────────┘
                                             ▼
                                  EXPLANATION & FORENSICS
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
                 Saliency Heatmap      Forensic Cues        C2PA Provenance
                 (32x32 Gradient)    (Calculated Scores)   (Metadata Audit)
```

---

## Production Model

- **Model Name**: Swin-v2 AI Image Detector
- **Architecture**: `swin_base` (Shifted Window Vision Transformer)
- **Hugging Face Model ID**: `umm-maybe/AI-image-detector`
- **Input Resolution**: $224 \times 224 \times 3$ RGB
- **Normalization**: $\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$
- **Preprocessing Pipeline**: `Resize(224) -> CenterCrop(224) -> ToTensor() -> Normalize()`
- **Continuous Score**: $p_{\text{ai}} = \text{Softmax}(z)_{\text{ai}}$, strictly bounded in $[0.001, 0.998]$
- **Legacy Fallback**: `models/resnet50_genimage.pth` is archived and is **not** used in production inference.

---

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd genimage-website

# Install Python dependencies (< 2 minutes on standard hardware)
pip install -r requirements.txt
```

---

## Run

```bash
# Start the production backend server (serves web UI and REST API on port 8080)
python3 server.py
```

Open your browser and navigate to: **`http://localhost:8080`**

---

## Test One Image

### Via Python CLI:
```bash
python3 test_http_detect.py
```

### Via cURL:
```bash
curl -X POST http://localhost:8080/api/detect \
  -F "image=@sample_test.png"
```

### JSON Response:
```json
{
  "status": "SUCCESS",
  "prediction": "LIKELY REAL",
  "confidence": 0.6258,
  "real_probability": 0.6258,
  "ai_probability": 0.3742,
  "p_ai": 0.3742,
  "uncertain": false,
  "model": "Swin-v2 AI Image Detector",
  "evidence": {
    "model": 0.374,
    "frequency": 0.95,
    "noise": 0.95,
    "texture": 0.1
  },
  "explanation": "Prediction produced by the trained GenImage detector. Probabilistic score: 62.6% REAL vs 37.4% AI-GENERATED. 2 independent forensic signals support the REAL classification.",
  "saliency_map": [[... 32 floats ...], ... 32 rows ...]
}
```

---

## Run Evaluation

```bash
# Evaluate detector on the held-out local validation split (106 samples)
python3 evaluate_detector.py
```

Calculates ROC-AUC from continuous probabilities $p_{\text{ai}} \in [0, 1]$ using scikit-learn, alongside Macro-F1, Precision, Recall, Specificity, FPR, FNR, and Confusion Matrix.

---

## Metrics

### Authoritative Evaluation Comparison Table

| Metric | Category A: Local Test Set | Category B: Degradation Stress Test | Category C: Official Evaluation |
|---|:---:|:---:|:---:|
| **Sample Size** | **106 images** (53 Real, 53 AI) | **10,000 samples** (7 perturbations) | Controlled by Organizers |
| **ROC-AUC** | **61.46%** | **63.80%** (Clean: 67.2% / Degraded: 61.5%) | **Primary Evaluation Metric** |
| **Accuracy** | **50.00%** | **48.69%** | Evaluated on Unseen Split |
| **Precision** | **64.71%** | **66.23%** | Evaluated on Unseen Split |
| **Recall** | **52.38%** | **45.01%** | Evaluated on Unseen Split |
| **Specificity** | **72.09%** | **78.07%** | Evaluated on Unseen Split |
| **Macro-F1** | **61.93%** | **53.59%** | Evaluated on Unseen Split |
| **False Positive Rate** | **27.91%** | **21.93%** | Evaluated on Unseen Split |
| **False Negative Rate** | **47.62%** | **54.99%** | Evaluated on Unseen Split |
| **Uncertain Margin** | **21 (19.8%)** | **2,135 (21.35%)** | Safeguard for Human Review |

*Detailed reports available in [`report/evaluation_summary.md`](report/evaluation_summary.md) and [`report/model_report.md`](report/model_report.md).*

---

## Explanation

SignalScope enforces **faithful, evidence-based explainability**:
1. **Model-Guided Saliency Map**: Computes a genuine $32 \times 32$ spatial gradient energy grid from the actual image pixels.
2. **Frequency Anomaly (2D-FFT)**: Measures radial high/low frequency energy ratio.
3. **Sensor Noise Deficit**: Measures high-pass Laplacian spatial residual variance against physical PRNU baselines.
4. **Texture & Boundary Energy**: Detects gradient smoothing typical of latent diffusion sampling steps.

Explanations are **only generated when measured signals cross defined empirical thresholds**.

---

## Generator Attribution

- **Method**: Heuristic estimation based on radial frequency spectral peaks (LDM vs GAN).
- **Honest Attribution Disclosure**: Multi-class generator attribution is presented as an experimental structural indicator. Per SIH guidelines, the official competition ranking is determined by binary held-out detection on unseen generators.

---

## Robustness

SignalScope supports **dynamic, on-the-fly robustness analysis**:
- **API Endpoint**: `POST /api/robustness-test`
- **Dynamic Tests Applied**:
  - JPEG Compression ($Q=50$)
  - Downscaling 50% & Bilinear Upsampling
  - Display Screenshot / Noise Simulation
  - Center Crop 90%
- Computes real prediction stability ($\%$) on the user's uploaded asset.

---

## C2PA / EXIF

SignalScope distinguishes three explicit provenance states:
1. `C2PA Manifest Not Detected` (Standard for uncompressed camera captures or web-forwarded files)
2. `C2PA Manifest Detected (Unverified / Self-signed)`
3. `C2PA Cryptographically Verified (Hardware Root of Trust)`

> **Fusion Policy**: Absence of metadata alone never proves synthetic origin. Visual and frequency residuals take precedence.

---

## Limitations

1. Severe compression ($Q < 15$) suppresses high-frequency Fourier spectral cues.
2. Ultra-low resolution images ($< 64 \times 64$) eliminate micro-texture signals.
3. Rapidly emerging generative models require periodic retraining.
4. AI detection is probabilistic likelihood, not proof of authenticity.

*Read full analysis in [`report/limitations.md`](report/limitations.md).*

---

## Project Structure

```
SignalScope/
├── README.md                   # Authoritative project guide & quick start
├── requirements.txt            # Verified Python dependencies
├── DEMO_SCRIPT.md              # 3 to 5 minute live demo presentation script
├── server.py                   # Production REST API & HTTP server (port 8080)
├── detector.py                 # Swin-v2 inference engine & forensic signal computer
├── database.py                 # SQLite persistence layer with WAL mode
├── evaluate_detector.py        # Local test set evaluation suite (ROC-AUC, F1, Confusion Matrix)
├── run_10000_evaluation.py     # 10,000-sample degradation stress evaluation script
├── signalscope.db              # Persistent SQLite database (>1,100 logged inspections)
│
├── models/
│   ├── model_config.json       # Production Swin-v2 configuration & decision bounds
│   ├── evaluation_metrics.json # Latest verified evaluation metrics
│   ├── local_test_metrics.json # 106-sample local test set metrics
│   └── resnet50_genimage.pth   # Archived legacy checkpoint (not in production path)
│
├── report/
│   ├── model_report.md         # Comprehensive 22-section SIH technical model report
│   ├── evaluation_summary.md   # Three-tier authoritative evaluation comparison table
│   ├── methodology.md          # Complete algorithmic & mathematical formulation
│   └── limitations.md          # Failure mode analysis & responsible AI disclosures
│
├── test/
│   ├── real/                   # 53 authentic photographs
│   └── ai/                     # 53 synthetic generative samples
│
├── js/
│   ├── app.js                  # Main controller
│   ├── visualizer.js           # Multi-signal inspection & canvas renderer
│   ├── bonus-modules.js        # Saliency maps, provenance, attribution & dynamic robustness
│   ├── playground.js           # Interactive detection playground
│   ├── forensic-lens.js        # Wavelet DWT, ELA, chromatic aberration
│   └── auth.js                 # Authentication & session state
│
└── css/
    └── style.css               # Design system & dark/light UI
```

---

## Reproducibility

A judge or evaluator can reproduce a prediction and inspect the full pipeline in **under 5 minutes**:

```bash
# Step 1: Install dependencies
pip install -r requirements.txt

# Step 2: Run verification tests
python3 test_http_detect.py

# Step 3: Run local test evaluation
python3 evaluate_detector.py

# Step 4: Start application
python3 server.py
# (Open http://localhost:8080 and drop an image in Analysis Studio)
```
