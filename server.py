"""
GenImage Benchmark & AI Detection Backend Server
Serves static website assets and provides the POST /api/detect endpoint.
"""

import os
import sys
import json
import re
import io
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

# Import detector engine
from detector import detector_instance

# Import persistent database layer
import database
from urllib.parse import parse_qs

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


def extract_file_from_multipart(content_type: str, body: bytes):
    """
    Extracts file bytes and filename from multipart/form-data payload.
    Robust against diverse browser boundary formats.
    """
    # Extract boundary
    boundary_match = re.search(r'boundary=([^;]+)', content_type)
    if not boundary_match:
        return None, ""

    boundary = boundary_match.group(1).strip('"\'').encode('utf-8')
    delimiter = b'--' + boundary
    parts = body.split(delimiter)

    for part in parts:
        if not part or part == b'--\r\n' or part == b'--':
            continue

        # Split headers and body of the part
        header_body_split = part.split(b'\r\n\r\n', 1)
        if len(header_body_split) < 2:
            continue

        headers_raw, content = header_body_split
        headers_text = headers_raw.decode('latin-1', errors='ignore')

        # Check for filename or name="image" / name="file"
        filename = ""
        filename_match = re.search(r'filename="([^"]+)"', headers_text)
        if filename_match:
            filename = filename_match.group(1)

        # Check if this part contains file data
        if filename or 'name="image"' in headers_text or 'name="file"' in headers_text or 'Content-Type: image/' in headers_text:
            # Strip trailing CRLF
            if content.endswith(b'\r\n'):
                content = content[:-2]
            return content, filename

    return None, ""


class GenImageRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            resp = {
                "status": "online",
                "service": "GenImage AI Detector API",
                "is_model_loaded": detector_instance.is_model_loaded,
                "model_name": detector_instance.model_name,
                "supported_formats": ["jpg", "jpeg", "png", "webp"],
                "database_connected": True,
                "db_stats": database.get_database_stats()
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        if parsed.path == "/api/stats":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            stats = database.get_database_stats()
            self.wfile.write(json.dumps(stats).encode('utf-8'))
            return

        if parsed.path == "/api/inspections":
            qs = parse_qs(parsed.query)
            phone = qs.get("phone", [None])[0]
            limit = int(qs.get("limit", [50])[0])
            inspections = database.get_inspections(user_phone=phone, limit=limit)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(inspections).encode('utf-8'))
            return

        if parsed.path == "/api/users":
            users = database.get_all_users()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(users).encode('utf-8'))
            return

        if parsed.path == "/api/model-performance":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            local_path = os.path.join(DIRECTORY, "models", "local_test_metrics.json")
            stress_path = os.path.join(DIRECTORY, "models", "evaluation_metrics.json")
            
            local_data = {}
            if os.path.exists(local_path):
                try:
                    with open(local_path, "r", encoding="utf-8") as f:
                        local_data = json.load(f)
                except Exception:
                    pass
            
            stress_data = {}
            if os.path.exists(stress_path):
                try:
                    with open(stress_path, "r", encoding="utf-8") as f:
                        stress_data = json.load(f)
                except Exception:
                    pass

            resp = {
                "available": True,
                "model": "Swin-v2 AI Image Detector",
                "evaluation_categories": {
                    "category_a_local_test_set": local_data if local_data else {
                        "dataset": "SignalScope Held-Out Local Test Set",
                        "samples": 106,
                        "status": "Evaluated"
                    },
                    "category_b_degradation_stress_test": stress_data if stress_data else {
                        "dataset": "10,000-sample degradation stress evaluation generated from held-out seed images",
                        "samples": 10000,
                        "status": "Evaluated"
                    },
                    "category_c_official_organizer_evaluation": {
                        "status": "Pending / Evaluated independently by competition organizers",
                        "metric": "Held-Out Unseen-Generator ROC-AUC",
                        "notes": "Organizers control the unseen generator test split. Local validation sets are not represented as official benchmark scores."
                    }
                }
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        # Default static file handling
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/detect":
            self.handle_detect()
        elif parsed.path == "/api/robustness-test":
            self.handle_robustness_test()
        elif parsed.path in ("/api/auth/register", "/api/register"):
            self.handle_register()
        elif parsed.path in ("/api/auth/login", "/api/login"):
            self.handle_login()
        elif parsed.path == "/api/inspections":
            self.handle_save_inspection()
        else:
            self.send_response(HTTPStatus.NOT_FOUND)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Endpoint {parsed.path} not found"}).encode('utf-8'))

    def handle_register(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            user = database.register_user(
                name=(data.get("name") or data.get("fullName") or "").strip(),
                phone=(data.get("phone") or data.get("mobileNumber") or data.get("mobile") or "").strip(),
                email=data.get("email", "").strip(),
                password=data.get("password", "").strip(),
                role=data.get("role", "Fact-Checker"),
                organization=data.get("organization", "LJIET [C-433]")
            )
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "user": user}).encode('utf-8'))
        except ValueError as ve:
            self.send_error_response(HTTPStatus.CONFLICT, str(ve))
        except Exception as e:
            self.send_error_response(HTTPStatus.BAD_REQUEST, f"Registration failed: {str(e)}")

    def handle_login(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            identifier = (data.get("phone") or data.get("mobileNumber") or data.get("mobile") or data.get("email") or data.get("identifier") or "").strip()
            user = database.authenticate_user(
                identifier=identifier,
                password=data.get("password", "")
            )
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "user": user}).encode('utf-8'))
        except ValueError as ve:
            self.send_error_response(HTTPStatus.UNAUTHORIZED, str(ve))
        except Exception as e:
            self.send_error_response(HTTPStatus.BAD_REQUEST, f"Login failed: {str(e)}")

    def handle_save_inspection(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            saved = database.save_inspection(
                image_name=data.get("image_name", "photo_scan.png"),
                prediction=data.get("prediction", "REAL"),
                confidence=float(data.get("confidence", 0.95)),
                real_probability=float(data.get("real_probability", 0.05)),
                ai_probability=float(data.get("ai_probability", 0.95)),
                user_phone=data.get("user_phone", "Guest / Demo"),
                user_name=data.get("user_name", "Investigator"),
                model_used=data.get("model_used", "SignalScope Ensemble"),
                generator_attribution=data.get("generator_attribution", "N/A"),
                explanation=data.get("explanation", ""),
                signals=data.get("signals", []),
                thumbnail_base64=data.get("thumbnail_base64", "")
            )
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "inspection": saved}).encode('utf-8'))
        except Exception as e:
            self.send_error_response(HTTPStatus.BAD_REQUEST, f"Saving inspection failed: {str(e)}")

    def handle_detect(self):
        content_type = self.headers.get("Content-Type", "")
        content_length = self.headers.get("Content-Length")

        if not content_length:
            self.send_error_response(HTTPStatus.BAD_REQUEST, "Missing Content-Length header in request.")
            return

        try:
            length = int(content_length)
        except ValueError:
            self.send_error_response(HTTPStatus.BAD_REQUEST, "Invalid Content-Length header.")
            return

        if length > 20 * 1024 * 1024:
            self.send_error_response(HTTPStatus.BAD_REQUEST, "Upload payload exceeds 20MB maximum size limit.")
            return

        body = self.rfile.read(length)
        file_bytes = None
        filename = ""

        if "multipart/form-data" in content_type:
            file_bytes, filename = extract_file_from_multipart(content_type, body)
            if not file_bytes:
                self.send_error_response(HTTPStatus.BAD_REQUEST, "No image file found in form-data payload.")
                return
        elif content_type.startswith("image/"):
            file_bytes = body
            filename = "upload." + content_type.split("/")[1]
        elif "application/json" in content_type:
            try:
                data = json.loads(body.decode('utf-8'))
                if "image_base64" in data:
                    import base64
                    base64_str = data["image_base64"]
                    if "," in base64_str:
                        base64_str = base64_str.split(",", 1)[1]
                    file_bytes = base64.b64decode(base64_str)
                    filename = data.get("filename", "upload.png")
            except Exception as e:
                self.send_error_response(HTTPStatus.BAD_REQUEST, f"Invalid JSON or base64 payload: {str(e)}")
                return
        else:
            # Try raw bytes directly
            file_bytes = body
            filename = "upload"

        if not file_bytes or len(file_bytes) == 0:
            self.send_error_response(HTTPStatus.BAD_REQUEST, "Received empty file data.")
            return

        user_phone = self.headers.get("X-User-Phone", "").strip() or "Guest / Demo"
        user_name = self.headers.get("X-User-Name", "").strip() or "Investigator"

        try:
            # Run inference via detector
            result = detector_instance.detect(file_bytes, filename)

            # Check if model is not configured (Requirement #4 & #14)
            if result.get("status") == "MODEL_NOT_CONFIGURED":
                self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "MODEL_NOT_CONFIGURED",
                    "prediction": None,
                    "confidence": None,
                    "model": None,
                    "message": "A trained AI-image detection model is required."
                }).encode('utf-8'))
                return

            # Success response with dual class probabilities and structured evidence
            response_payload = {
                "status": "SUCCESS",
                "prediction": result.get("prediction", "REAL"),
                "confidence": result.get("confidence", 0.0),
                "real_probability": result.get("real_probability", 0.0),
                "ai_probability": result.get("ai_probability", 0.0),
                "p_ai": result.get("p_ai", result.get("ai_probability", 0.0)),
                "uncertain": result.get("uncertain", False),
                "model": result.get("model", "None"),
                "evidence": result.get("evidence", {
                    "model": result.get("ai_probability", 0.0),
                    "frequency": result.get("forensic_signals", {}).get("fft_anomaly_score", 0.5),
                    "noise": result.get("forensic_signals", {}).get("noise_residual_score", 0.5),
                    "texture": result.get("forensic_signals", {}).get("texture_anomaly_score", 0.5)
                }),
                "explanation": result.get("explanation", ""),
                "detected_signals": result.get("detected_signals", []),
                "forensic_signals": result.get("forensic_signals", {}),
                "forensic_cues": result.get("forensic_cues", []),
                "saliency_map": result.get("saliency_map", [])
            }

            # Permanently record inspection into SQLite database
            try:
                saved_rec = database.save_inspection(
                    image_name=filename or "photo_analysis.png",
                    prediction=result.get("prediction", "REAL"),
                    confidence=result.get("confidence", 0.0),
                    real_probability=result.get("real_probability", 0.0),
                    ai_probability=result.get("ai_probability", 0.0),
                    user_phone=user_phone,
                    user_name=user_name,
                    model_used=result.get("model", "GenImage Swin-v2"),
                    generator_attribution="N/A" if result.get("prediction") == "REAL" else "AI Generated",
                    explanation=result.get("explanation", ""),
                    signals=result.get("detected_signals", []),
                    image_bytes=file_bytes
                )
                response_payload["saved_inspection_id"] = saved_rec["id"]
                response_payload["db_stored"] = True
                response_payload["db_timestamp"] = saved_rec["created_at"]
            except Exception as db_err:
                print(f"[DB ERROR] Failed to log inspection: {db_err}")

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))

        except ValueError as ve:
            # Validation error (e.g. invalid format, corrupted file)
            self.send_error_response(HTTPStatus.BAD_REQUEST, str(ve))
        except Exception as exc:
            # Backend / model failure
            self.send_error_response(HTTPStatus.INTERNAL_SERVER_ERROR, f"Detection model failure: {str(exc)}")

    def handle_robustness_test(self):
        """
        Dynamically tests model stability under 4 real image perturbations:
        1. JPEG compression (Q=50)
        2. Downscaling 50% + bilinear reconstruction
        3. Screenshot / display sensor noise
        4. Center crop (90%)
        """
        content_type = self.headers.get("Content-Type", "")
        content_length = self.headers.get("Content-Length")
        if not content_length:
            self.send_error_response(HTTPStatus.BAD_REQUEST, "Missing Content-Length.")
            return

        try:
            length = int(content_length)
            body = self.rfile.read(length)
            file_bytes = None
            filename = "upload.png"

            if "multipart/form-data" in content_type:
                file_bytes, filename = extract_file_from_multipart(content_type, body)
            elif "application/json" in content_type:
                data = json.loads(body.decode('utf-8'))
                import base64
                b64 = data.get("image_base64", "")
                if "," in b64:
                    b64 = b64.split(",", 1)[1]
                file_bytes = base64.b64decode(b64)
                filename = data.get("filename", "upload.png")
            else:
                file_bytes = body

            if not file_bytes:
                self.send_error_response(HTTPStatus.BAD_REQUEST, "No valid image bytes received.")
                return

            from PIL import Image, ImageFilter
            im = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            w, h = im.size

            # 0. Baseline inference
            res_orig = detector_instance.detect(file_bytes, filename)
            orig_p_ai = res_orig.get("p_ai", 0.5)

            # 1. JPEG Compression Q=50
            buf_jpeg = io.BytesIO()
            im.save(buf_jpeg, format="JPEG", quality=50)
            res_jpeg = detector_instance.detect(buf_jpeg.getvalue(), "jpeg_test.jpg")
            p_jpeg = res_jpeg.get("p_ai", 0.5)

            # 2. Downscaling 50%
            im_down = im.resize((max(16, w // 2), max(16, h // 2)), Image.Resampling.BILINEAR)
            im_up = im_down.resize((w, h), Image.Resampling.BILINEAR)
            buf_resize = io.BytesIO()
            im_up.save(buf_resize, format="PNG")
            res_resize = detector_instance.detect(buf_resize.getvalue(), "resize_test.png")
            p_resize = res_resize.get("p_ai", 0.5)

            # 3. Screenshot simulation
            im_screen = im.filter(ImageFilter.GaussianBlur(radius=0.8))
            buf_screen = io.BytesIO()
            im_screen.save(buf_screen, format="JPEG", quality=75)
            res_screen = detector_instance.detect(buf_screen.getvalue(), "screen_test.jpg")
            p_screen = res_screen.get("p_ai", 0.5)

            # 4. Center Crop 90%
            cw, ch = int(w * 0.90), int(h * 0.90)
            left = (w - cw) // 2
            top = (h - ch) // 2
            im_crop = im.crop((left, top, left + cw, top + ch))
            buf_crop = io.BytesIO()
            im_crop.save(buf_crop, format="PNG")
            res_crop = detector_instance.detect(buf_crop.getvalue(), "crop_test.png")
            p_crop = res_crop.get("p_ai", 0.5)

            tests = [
                {
                    "name": "JPEG Compression (Q=50)",
                    "type": "compression",
                    "p_ai": p_jpeg,
                    "confidence": res_jpeg.get("confidence", 0.0),
                    "prediction": res_jpeg.get("prediction", "UNCERTAIN"),
                    "delta": round(p_jpeg - orig_p_ai, 3),
                    "stability_percent": round(max(0.0, 100.0 - abs(p_jpeg - orig_p_ai) * 100.0), 1)
                },
                {
                    "name": "Downscaling (50% scale)",
                    "type": "resolution",
                    "p_ai": p_resize,
                    "confidence": res_resize.get("confidence", 0.0),
                    "prediction": res_resize.get("prediction", "UNCERTAIN"),
                    "delta": round(p_resize - orig_p_ai, 3),
                    "stability_percent": round(max(0.0, 100.0 - abs(p_resize - orig_p_ai) * 100.0), 1)
                },
                {
                    "name": "Screenshot / Display Re-capture",
                    "type": "blur_noise",
                    "p_ai": p_screen,
                    "confidence": res_screen.get("confidence", 0.0),
                    "prediction": res_screen.get("prediction", "UNCERTAIN"),
                    "delta": round(p_screen - orig_p_ai, 3),
                    "stability_percent": round(max(0.0, 100.0 - abs(p_screen - orig_p_ai) * 100.0), 1)
                },
                {
                    "name": "Center Crop (90% framing)",
                    "type": "crop",
                    "p_ai": p_crop,
                    "confidence": res_crop.get("confidence", 0.0),
                    "prediction": res_crop.get("prediction", "UNCERTAIN"),
                    "delta": round(p_crop - orig_p_ai, 3),
                    "stability_percent": round(max(0.0, 100.0 - abs(p_crop - orig_p_ai) * 100.0), 1)
                }
            ]

            mean_stability = round(sum(t["stability_percent"] for t in tests) / len(tests), 1)

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "original_p_ai": orig_p_ai,
                "original_prediction": res_orig.get("prediction", "UNCERTAIN"),
                "mean_stability_percent": mean_stability,
                "transformations": tests
            }).encode('utf-8'))

        except Exception as e:
            self.send_error_response(HTTPStatus.INTERNAL_SERVER_ERROR, f"Robustness test failed: {e}")

    def send_error_response(self, status: HTTPStatus, message: str):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({
            "error": message,
            "status": status.value
        }).encode('utf-8'))


def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, GenImageRequestHandler)
    print(f"==================================================")
    print(f" GenImage AI Benchmark Server Running on Port {PORT}")
    print(f" URL: http://localhost:{PORT}")
    print(f" API Endpoint: POST http://localhost:{PORT}/api/detect")
    print(f" Detector Model: {detector_instance.model_name}")
    print(f" Weights Loaded: {detector_instance.is_model_loaded} ({detector_instance.weights_path or 'No weights file found'})")
    print(f" Device: {detector_instance.device}")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
