"""
GenImage Evaluation Script
Evaluates detector on a held-out test dataset folder structured as:
test/
    real/
    ai/

Calculates:
- Accuracy
- Precision
- Recall
- F1-score
- ROC-AUC
- Confusion Matrix (TP, TN, FP, FN)
- Performance breakdown by image format (.jpg, .png, .webp)

Saves verified metrics to models/evaluation_metrics.json.
"""

import os
import sys
import json
from typing import Dict, Any, List

from detector import detector_instance, SUPPORTED_FORMATS

TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test")
METRICS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "evaluation_metrics.json")


def load_images_from_folder(folder_path: str) -> List[str]:
    if not os.path.exists(folder_path):
        return []
    valid_exts = tuple(f".{ext.lower()}" for ext in SUPPORTED_FORMATS)
    images = []
    for root, _, files in os.walk(folder_path):
        for f in files:
            if f.lower().endswith(valid_exts):
                images.append(os.path.join(root, f))
    return images


def run_evaluation(test_dir: str = TEST_DIR) -> Dict[str, Any]:
    print("=" * 60)
    print("         GenImage AI Detector Evaluation Suite")
    print("=" * 60)

    if not detector_instance.is_model_loaded:
        print("\n[STATUS] NO REAL DETECTION MODEL IS CURRENTLY INSTALLED")
        print("Evaluation cannot proceed without a genuine trained detection model.")
        print("Please place a trained GenImage model checkpoint (.pth / .onnx)")
        print("in the models/ directory before running evaluation.\n")
        print("=" * 60)
        return {
            "status": "NO_MODEL_CONFIGURED",
            "message": "NO REAL DETECTION MODEL IS CURRENTLY INSTALLED"
        }

    real_dir = os.path.join(test_dir, "real")
    ai_dir = os.path.join(test_dir, "ai")

    real_files = load_images_from_folder(real_dir)
    ai_files = load_images_from_folder(ai_dir)

    total_files = len(real_files) + len(ai_files)
    print(f"Model: {detector_instance.model_name} ({detector_instance.architecture})")
    print(f"Device: {detector_instance.device}")
    print(f"Found {len(real_files)} authentic (real) images in: {real_dir}")
    print(f"Found {len(ai_files)} synthetic (ai) images in: {ai_dir}")
    print(f"Total test images: {total_files}\n")

    if total_files == 0:
        print("[WARNING] Test directory is empty. Add test images to:")
        print(f"  Real images: {real_dir}")
        print(f"  AI images:   {ai_dir}")
        print("=" * 60)
        return {
            "status": "NO_TEST_DATA",
            "message": "No test images found in test/real and test/ai folders."
        }

    # Tracking metrics
    # Positive class = AI-GENERATED (1), Negative class = REAL (0)
    tp = 0  # Actual AI, Predicted AI
    fp = 0  # Actual Real, Predicted AI
    tn = 0  # Actual Real, Predicted REAL
    fn = 0  # Actual AI, Predicted REAL
    uncertain = 0

    y_true = []
    y_scores = []
    format_stats = {}

    def test_single_file(filepath: str, true_label: str):
        nonlocal tp, fp, tn, fn, uncertain
        ext = os.path.splitext(filepath)[1].lower().replace('.', '')
        if ext not in format_stats:
            format_stats[ext] = {"total": 0, "correct": 0}
        format_stats[ext]["total"] += 1

        target_binary = 1 if true_label == "AI-GENERATED" else 0
        y_true.append(target_binary)

        try:
            with open(filepath, "rb") as f:
                file_bytes = f.read()
            res = detector_instance.detect(file_bytes, os.path.basename(filepath))
            pred = res.get("prediction", "UNCERTAIN")
            ai_prob = res.get("ai_probability", 0.5)
            y_scores.append(ai_prob)

            if pred == "UNCERTAIN":
                uncertain += 1
                is_correct = False
            elif true_label == "AI-GENERATED":
                if pred == "AI-GENERATED":
                    tp += 1
                    is_correct = True
                else:
                    fn += 1
                    is_correct = False
            else:  # true_label == 'REAL'
                if pred == "REAL":
                    tn += 1
                    is_correct = True
                else:
                    fp += 1
                    is_correct = False

            if is_correct:
                format_stats[ext]["correct"] += 1

            conf = res.get('confidence', 0.0)
            if isinstance(conf, float) and conf <= 1.0:
                conf_pct = round(conf * 100, 1)
            else:
                conf_pct = round(float(conf), 1)

            status_txt = '[CORRECT]' if is_correct else '[INCORRECT]'
            print(f"[{true_label[:4]}] {os.path.basename(filepath)} -> Pred: {pred} ({conf_pct}%) {status_txt}")

        except Exception as e:
            print(f"[ERROR] Failed to process {filepath}: {e}")
            y_scores.append(0.5)

    print("--- Evaluating Synthetic (AI) Images ---")
    for f in ai_files:
        test_single_file(f, "AI-GENERATED")

    print("\n--- Evaluating Authentic (Real) Images ---")
    for f in real_files:
        test_single_file(f, "REAL")

    # Calculations
    evaluated_count = tp + tn + fp + fn + uncertain
    correct_count = tp + tn
    accuracy = (correct_count / evaluated_count * 100) if evaluated_count > 0 else 0.0
    precision = (tp / (tp + fp) * 100) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn) * 100) if (tp + fn) > 0 else 0.0
    specificity = (tn / (tn + fp) * 100) if (tn + fp) > 0 else 0.0

    # Macro-F1: harmonic mean of AI class and Real class F1 scores
    f1_ai = (2 * tp / (2 * tp + fp + fn)) if (2 * tp + fp + fn) > 0 else 0.0
    f1_real = (2 * tn / (2 * tn + fp + fn)) if (2 * tn + fp + fn) > 0 else 0.0
    macro_f1 = ((f1_ai + f1_real) / 2.0 * 100)

    # Error rates
    fpr = (fp / (fp + tn) * 100) if (fp + tn) > 0 else 0.0
    fnr = (fn / (fn + tp) * 100) if (fn + tp) > 0 else 0.0

    # Calculate ROC-AUC from continuous p_ai probability scores
    roc_auc = None
    try:
        from sklearn.metrics import roc_auc_score  # type: ignore[import-untyped,reportMissingImports]
        if len(set(y_true)) > 1:
            roc_auc = round(float(roc_auc_score(y_true, y_scores)) * 100, 2)
    except Exception as e:
        print(f"[Warning] Scikit-learn ROC-AUC calculation error: {e}")
        # Trapezoidal numerical approximation fallback
        try:
            pairs = sorted(zip(y_scores, y_true), key=lambda x: x[0])
            n_pos = sum(y_true)
            n_neg = len(y_true) - n_pos
            if n_pos > 0 and n_neg > 0:
                rank_sum = sum(i + 1 for i, (_, y) in enumerate(pairs) if y == 1)
                u = rank_sum - (n_pos * (n_pos + 1)) / 2
                roc_auc = round(float(u / (n_pos * n_neg)) * 100, 2)
        except Exception:
            pass

    print("\n" + "=" * 60)
    print("                 EVALUATION RESULTS")
    print("=" * 60)
    print(f"Dataset:           SignalScope Held-Out Local Test Set")
    print(f"Total Samples:     {evaluated_count}")
    print(f"True Positives:    {tp}  (AI correctly predicted as AI)")
    print(f"True Negatives:    {tn}  (Real correctly predicted as REAL)")
    print(f"False Positives:   {fp}  (Real falsely predicted as AI)")
    print(f"False Negatives:   {fn}  (AI falsely predicted as REAL)")
    print(f"Uncertain:         {uncertain}  (Ambiguous / near-threshold within margin)")
    print("-" * 60)
    print(f"Accuracy:          {accuracy:.2f}%")
    print(f"Precision:         {precision:.2f}%")
    print(f"Recall:            {recall:.2f}%")
    print(f"Specificity:       {specificity:.2f}%")
    print(f"Macro-F1:          {macro_f1:.2f}%")
    print(f"False Pos. Rate:   {fpr:.2f}%")
    print(f"False Neg. Rate:   {fnr:.2f}%")
    if roc_auc is not None:
        print(f"ROC-AUC:           {roc_auc:.2f}%")
    print("-" * 60)
    print("Confusion Matrix:")
    print("                  Predicted AI    Predicted REAL")
    print(f"  Actual AI         {tp:<15} {fn:<15}")
    print(f"  Actual REAL       {fp:<15} {tn:<15}")
    print("-" * 60)
    print("Format Breakdown:")
    for fmt, data in format_stats.items():
        acc = (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
        print(f"  .{fmt.upper():<6}: {data['correct']}/{data['total']} correct ({acc:.1f}%)")
    print("=" * 60)

    results_payload = {
        "status": "COMPLETED",
        "dataset": "SignalScope Held-Out Local Test Set",
        "evaluation_category": "LOCAL_TEST_SET",
        "model": detector_instance.model_name,
        "architecture": detector_instance.architecture,
        "samples": evaluated_count,
        "accuracy": round(accuracy, 2),
        "precision": round(precision, 2),
        "recall": round(recall, 2),
        "specificity": round(specificity, 2),
        "macro_f1": round(macro_f1, 2),
        "roc_auc": roc_auc,
        "false_positive_rate": round(fpr, 2),
        "false_negative_rate": round(fnr, 2),
        "confusion_matrix": {
            "TN": tn,
            "FP": fp,
            "FN": fn,
            "TP": tp,
            "uncertain": uncertain
        },
        "format_breakdown": format_stats,
        "notes": "Local development validation set. Official held-out evaluation is performed by competition organizers."
    }

    # Save metrics files for website display and audit report
    try:
        with open(METRICS_FILE, "w", encoding="utf-8") as f:
            json.dump(results_payload, f, indent=2)
        local_metrics_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "local_test_metrics.json")
        with open(local_metrics_file, "w", encoding="utf-8") as f:
            json.dump(results_payload, f, indent=2)
        print(f"\nSaved verified metrics to: {METRICS_FILE} and {local_metrics_file}")
    except Exception as e:
        print(f"Warning: Could not save metrics: {e}")

    return results_payload


if __name__ == "__main__":
    run_evaluation()
