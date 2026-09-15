# SignalScope Evaluation Summary

> **Official Evaluation Baseline**: Smart India Hackathon (SIH 2026)  
> **Problem Statement**: SignalScope — AI-Generated Media Forensics, Provenance & Explanation Engine  
> **Report Timestamp**: 2026-09-15  
> **Production Model**: Swin-v2 AI Image Detector (`umm-maybe/AI-image-detector`)

---

## 1. Local Test Set (Development & Validation Split)

- **Dataset**: `SignalScope Held-Out Local Test Set` (`test/real/` & `test/ai/`)
- **Evaluation Purpose**: Local validation, development calibration, sanity checking.
- **Evaluation Type**: Static held-out sample split (53 authentic nature/human photos, 53 synthetic generative samples).
- **Inference Mode**: Continuous probability output $p_{\text{ai}} \in [0, 1]$ via Swin Transformer Base ($224 \times 224$).

### Empirical Metrics Table

| Metric | Measured Value | Calculation Formula |
|---|:---:|---|
| **Total Samples** | **106** | $TP + TN + FP + FN + \text{Uncertain}$ |
| **ROC-AUC** | **61.46%** | Scikit-learn `roc_auc_score(y_true, continuous_p_ai)` |
| **Accuracy** | **50.00%** | $(TP + TN) / N_{\text{total}}$ |
| **Precision (AI)** | **64.71%** | $TP / (TP + FP)$ |
| **Recall (AI)** | **52.38%** | $TP / (TP + FN)$ |
| **Specificity (Real)**| **72.09%** | $TN / (TN + FP)$ |
| **Macro-F1** | **61.93%** | $(F1_{\text{AI}} + F1_{\text{Real}}) / 2$ |
| **False Positive Rate (FPR)** | **27.91%** | $FP / (FP + TN)$ *(Risk of falsely labeling real photo as AI)* |
| **False Negative Rate (FNR)** | **47.62%** | $FN / (FN + TP)$ *(Risk of missing synthetic deepfake)* |
| **Uncertainty Margin Count** | **21 (19.8%)** | Samples falling in ambiguity band $0.42 \le p_{\text{ai}} \le 0.58$ |

### Confusion Matrix

```
                  Predicted AI    Predicted REAL    Uncertain (Safety Band)
Actual AI               22              20                    11
Actual REAL             12              31                    10
```

---

## 2. Degradation Stress Test (Robustness Benchmark)

- **Dataset**: `10,000-sample degradation stress evaluation generated from held-out seed images`
- **Seed Dataset Size**: 106 verified held-out images (53 authentic, 53 synthetic).
- **Generated Samples**: 10,000 systematically perturbed samples across 7 corruption classes.
- **Scientific Purpose**: Quantifying detector stability and boundary resilience under real-world social media degradations.

### Stress Test Performance Breakdown

| Perturbation Category | Samples | Accuracy (%) | False Positives | False Negatives | Uncertain Band |
|---|:---:|:---:|:---:|:---:|:---:|
| **Clean Baseline** (No corruption) | 2,500 | **50.00%** | 282 | 471 | 497 |
| **Heavy JPEG** (Q=10, 20, 30, 50) | 2,000 | **48.10%** | 126 | 494 | 418 |
| **Gaussian & Defocus Blur** | 1,500 | **51.53%** | 90 | 314 | 323 |
| **Low-Resolution Downscaling** (32px to 112px)| 1,500 | **48.93%** | 143 | 279 | 344 |
| **Additive Sensor Noise** (High-ISO) | 1,000 | **48.60%** | 53 | 258 | 203 |
| **Contrast & Dynamic Range LUTs** | 800 | **41.12%** | 112 | 181 | 178 |
| **Hybrid Compound Perturbations** | 700 | **47.86%** | 76 | 117 | 172 |
| **TOTAL OVERALL** | **10,000** | **48.69%** | **882** | **2,114** | **2,135** |

### Robustness Summary

- **Clean Subset ROC-AUC**: ~67.2%
- **Degraded Subset ROC-AUC**: ~61.5%
- **Overall Stress-Test ROC-AUC**: ~63.8%
- **Overall Macro-F1**: 53.59%
- **Uncertainty Trigger Rate**: 21.35% (routed to human auditor queue)

---

## 3. Official Organizer Held-Out Test

- **Status**: **Pending / Evaluated independently by competition organizers**
- **Evaluation Mechanism**: Controlled evaluation on unseen generative engines (e.g., unseen Midjourney v6.1, Flux.1, SD3, Imagen 3).
- **Primary Competition Metric**: Held-out unseen generator ROC-AUC (dominant tie-breaker).
- **Transparency Policy**: The local 106-sample test set and 10,000-sample perturbation stress test are local engineering benchmarks; they are **never falsely claimed as official organizer scores**.
