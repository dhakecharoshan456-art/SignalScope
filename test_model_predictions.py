"""
Diagnostic Tool for Model Predictions
Accepts an image path and prints raw logits, dual probabilities, predicted class, and confidence.

Usage:
    py test_model_predictions.py <path_to_image>
"""

import sys
import os
import torch
from PIL import Image

# Ensure local imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detector import detector_instance


def test_image_prediction(image_path: str):
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at '{image_path}'")
        sys.exit(1)

    if not detector_instance.is_model_loaded:
        print("Error: No trained model loaded in detector.")
        sys.exit(1)

    # 1. Load image and perform exact model preprocessing
    try:
        pil_img = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"Error reading image '{image_path}': {e}")
        sys.exit(1)

    # 2. Raw forward pass & probability computation
    if detector_instance.model_type == "transformers":
        raw_output = detector_instance.hf_pipeline(pil_img)
        raw_logits = [item['score'] for item in raw_output]
        p_ai = 0.5
        p_real = 0.5
        for item in raw_output:
            lbl = str(item['label']).lower()
            if lbl in ('artificial', 'fake', 'ai', 'ai-generated', '0'):
                p_ai = float(item['score'])
            elif lbl in ('human', 'real', 'nature', '1'):
                p_real = float(item['score'])
    else:
        if detector_instance.preprocess is None:
            print("Preprocessor not available")
            return
        from typing import Any
        tensor: Any = detector_instance.preprocess(pil_img)
        if hasattr(tensor, 'unsqueeze'):
            tensor = tensor.unsqueeze(0).to(detector_instance.device)
        with torch.no_grad():
            if detector_instance.model_type == "onnx":
                input_name = detector_instance.onnx_session.get_inputs()[0].name
                ort_inputs = {input_name: tensor.cpu().numpy()}
                raw_logits_np = detector_instance.onnx_session.run(None, ort_inputs)[0]
                raw_logits = torch.from_numpy(raw_logits_np)[0]
            else:
                if detector_instance.model is None:
                    print("Model weights not available")
                    return
                raw_logits = detector_instance.model(tensor)[0]

        if raw_logits.shape[-1] == 1:
            p_ai = torch.sigmoid(raw_logits)[0].item()
            p_real = 1.0 - p_ai
        else:
            probs = torch.softmax(raw_logits, dim=-1)
            ai_idx = 0 if detector_instance.label_mapping.get("0") == "AI-GENERATED" else 1
            real_idx = 1 if ai_idx == 0 else 0
            p_ai = float(probs[ai_idx].item())
            p_real = float(probs[real_idx].item())

    # 4. Result prediction via detector
    with open(image_path, "rb") as f:
        file_bytes = f.read()
    det_result = detector_instance.detect(file_bytes, os.path.basename(image_path))

    if hasattr(raw_logits, 'tolist'):
        logits_list = [round(float(x), 4) for x in raw_logits.tolist()] # type: ignore[union-attr]
    else:
        logits_list = [round(float(x), 4) for x in raw_logits]

    print(f"Image: {os.path.abspath(image_path)}")
    print(f"Model: {detector_instance.model_name}")
    print(f"Raw logits: {logits_list}")
    print(f"AI probability: {p_ai * 100:.2f}% ({p_ai:.4f})")
    print(f"REAL probability: {p_real * 100:.2f}% ({p_real:.4f})")
    print(f"Predicted class: {det_result.get('prediction')}")
    conf_val = det_result.get('confidence')
    conf_str = f"{conf_val * 100:.2f}%" if isinstance(conf_val, (int, float)) else "N/A"
    print(f"Confidence: {conf_str}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: py test_model_predictions.py <path_to_image>")
        sys.exit(1)
    test_image_prediction(sys.argv[1])
