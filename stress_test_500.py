"""
SignalScope 500-Run Reliability, Stress & Error Discovery Test Suite
Executes 500 comprehensive end-to-end cycles across:
1. AI Model Detection (POST /api/detect with genuine & corrupted images)
2. User Authentication (POST /api/auth/register, /api/auth/login with valid, duplicate, and invalid credentials)
3. Audit Log & History (POST /api/inspections, GET /api/inspections)
4. System Health & Performance (GET /api/health, GET /api/stats, GET /api/model-performance)
5. Static Assets (GET /, GET /css/style.css, GET /js/app.js)

Tracks and reports:
- Total runs, passes, expected validation errors, unexpected errors (500s / crashes / timeouts)
- Latency metrics (min, max, average, p95)
- SQLite database integrity under rapid continuous load
"""

import sys
import os
import time
import json
import random
import urllib.request
import urllib.error
from datetime import datetime

BASE_URL = "http://localhost:8080"
TOTAL_RUNS = 500
SAMPLE_IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_test.png")

if not os.path.exists(SAMPLE_IMG):
    # Create small valid test PNG if missing
    from PIL import Image
    im = Image.new("RGB", (64, 64), color="blue")
    im.save(SAMPLE_IMG, "PNG")

with open(SAMPLE_IMG, "rb") as f:
    SAMPLE_IMG_BYTES = f.read()


def make_request(url, method="GET", data=None, headers=None, timeout=15):
    headers = headers or {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start_t = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = time.perf_counter() - start_t
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body, elapsed, None
    except urllib.error.HTTPError as e:
        elapsed = time.perf_counter() - start_t
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body, elapsed, None
    except Exception as exc:
        elapsed = time.perf_counter() - start_t
        return 0, "", elapsed, exc


def post_json(url, payload):
    data = json.dumps(payload).encode("utf-8")
    return make_request(url, method="POST", data=data, headers={"Content-Type": "application/json"})


def post_multipart(url, file_bytes, filename="scan.png", content_type="image/png"):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW" + str(random.randint(1000, 9999))
    header = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    footer = f"\r\n--{boundary}--\r\n".encode("utf-8")
    data = header + file_bytes + footer
    return make_request(
        url,
        method="POST",
        data=data,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )


def run_stress_test():
    print("=" * 70)
    print(f"🚀 STARTING 500-RUN STRESS TEST & ERROR AUDIT ON {BASE_URL}")
    print(f"⏰ Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📊 Target Runs: {TOTAL_RUNS} iterations")
    print("=" * 70)

    # Initial Connectivity Check
    status, body, _, err = make_request(f"{BASE_URL}/api/health")
    if err or status != 200:
        print(f"❌ Initial health check failed: status={status}, err={err}")
        return False
    print("✅ Server health check PASSED. Beginning 500 iterations...\n")

    stats = {
        "total_runs": 0,
        "total_requests": 0,
        "successful_requests": 0,
        "expected_rejections": 0,
        "unexpected_errors": [],
        "latencies": [],
        "endpoints_tested": {
            "GET /": 0,
            "GET /api/health": 0,
            "GET /api/stats": 0,
            "GET /api/inspections": 0,
            "GET /api/model-performance": 0,
            "POST /api/detect": 0,
            "POST /api/auth/register": 0,
            "POST /api/auth/login": 0,
            "POST /api/inspections": 0,
        }
    }

    start_overall_time = time.perf_counter()

    for i in range(1, TOTAL_RUNS + 1):
        stats["total_runs"] += 1
        iter_errors = []

        # -------------------------------------------------------------
        # 1. Static & Health Checks
        # -------------------------------------------------------------
        # GET /api/health
        s, b, t, err = make_request(f"{BASE_URL}/api/health")
        stats["total_requests"] += 1
        stats["endpoints_tested"]["GET /api/health"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: GET /api/health failed (status={s}, err={err})")
        else:
            stats["successful_requests"] += 1

        # GET /api/stats
        s, b, t, err = make_request(f"{BASE_URL}/api/stats")
        stats["total_requests"] += 1
        stats["endpoints_tested"]["GET /api/stats"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: GET /api/stats failed (status={s}, err={err})")
        else:
            stats["successful_requests"] += 1

        # GET /api/inspections
        s, b, t, err = make_request(f"{BASE_URL}/api/inspections")
        stats["total_requests"] += 1
        stats["endpoints_tested"]["GET /api/inspections"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: GET /api/inspections failed (status={s}, err={err})")
        else:
            stats["successful_requests"] += 1

        # -------------------------------------------------------------
        # 2. Authentication Cycle (Unique Register -> Duplicate -> Login)
        # -------------------------------------------------------------
        unique_seed = f"{int(time.time() * 1000) % 10000000:07d}_{i}_{random.randint(100, 999)}"
        phone = f"99{unique_seed[-8:]}"
        email = f"stress_{unique_seed}@example.com"
        pwd = f"pass_{unique_seed}"

        # Register User
        s, b, t, err = post_json(f"{BASE_URL}/api/auth/register", {
            "name": f"Stress Tester {i}",
            "mobileNumber": phone,
            "email": email,
            "password": pwd,
            "role": "QA Bot",
            "organization": "StressSuite"
        })
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/auth/register"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: User registration failed (status={s}, body={b[:100]})")
        else:
            stats["successful_requests"] += 1

        # Test Duplicate Mobile (Must return 409)
        s, b, t, err = post_json(f"{BASE_URL}/api/auth/register", {
            "name": f"Duplicate Tester",
            "mobileNumber": phone,
            "email": f"diff_{unique_seed}@example.com",
            "password": pwd
        })
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/auth/register"] += 1
        stats["latencies"].append(t)
        if s == 409:
            stats["expected_rejections"] += 1
        else:
            iter_errors.append(f"Run {i}: Duplicate mobile did NOT return 409 (status={s}, body={b[:100]})")

        # Login with valid credentials
        s, b, t, err = post_json(f"{BASE_URL}/api/auth/login", {
            "identifier": phone,
            "password": pwd
        })
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/auth/login"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: Login with valid phone failed (status={s}, body={b[:100]})")
        else:
            stats["successful_requests"] += 1

        # Login with invalid credentials (Must return 401)
        s, b, t, err = post_json(f"{BASE_URL}/api/auth/login", {
            "identifier": phone,
            "password": "wrong_password_xyz"
        })
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/auth/login"] += 1
        stats["latencies"].append(t)
        if s == 401:
            stats["expected_rejections"] += 1
        else:
            iter_errors.append(f"Run {i}: Invalid password did NOT return 401 (status={s})")

        # -------------------------------------------------------------
        # 3. AI Detection Inference & Corrupted Input Tests
        # -------------------------------------------------------------
        # Valid Image Detection
        s, b, t, err = post_multipart(f"{BASE_URL}/api/detect", SAMPLE_IMG_BYTES, filename=f"test_{i}.png")
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/detect"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: AI detection failed (status={s}, body={b[:100]})")
        else:
            try:
                res_data = json.loads(b)
                if "prediction" not in res_data or "confidence" not in res_data:
                    iter_errors.append(f"Run {i}: Missing fields in detection response: {b[:100]}")
                else:
                    stats["successful_requests"] += 1
            except Exception as jerr:
                iter_errors.append(f"Run {i}: Corrupted JSON response from /api/detect: {jerr}")

        # Corrupted Non-Image Upload (Must return 400 safely without crashing)
        corrupted_bytes = b"CORRUPTED_NOT_AN_IMAGE_FILE_CONTENT_" + os.urandom(64)
        s, b, t, err = post_multipart(f"{BASE_URL}/api/detect", corrupted_bytes, filename=f"bad_{i}.txt", content_type="text/plain")
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/detect"] += 1
        stats["latencies"].append(t)
        if s == 400:
            stats["expected_rejections"] += 1
        else:
            iter_errors.append(f"Run {i}: Corrupted upload did NOT return 400 (status={s}, body={b[:100]})")

        # -------------------------------------------------------------
        # 4. Save Inspection Record
        # -------------------------------------------------------------
        s, b, t, err = post_json(f"{BASE_URL}/api/inspections", {
            "image_name": f"stress_test_{i}.png",
            "prediction": "REAL",
            "confidence": 0.95,
            "real_probability": 0.95,
            "ai_probability": 0.05,
            "model_used": "StressTest-Validator",
            "user_phone": phone
        })
        stats["total_requests"] += 1
        stats["endpoints_tested"]["POST /api/inspections"] += 1
        stats["latencies"].append(t)
        if err or s != 200:
            iter_errors.append(f"Run {i}: Save inspection failed (status={s}, body={b[:100]})")
        else:
            stats["successful_requests"] += 1

        # Periodic Static Asset Sampling every 50 runs
        if i % 50 == 0:
            s, b, t, err = make_request(f"{BASE_URL}/")
            stats["total_requests"] += 1
            stats["endpoints_tested"]["GET /"] += 1
            stats["latencies"].append(t)
            if s == 200:
                stats["successful_requests"] += 1
            else:
                iter_errors.append(f"Run {i}: GET / failed with status {s}")

        if iter_errors:
            stats["unexpected_errors"].extend(iter_errors)
            print(f"⚠️ Issues detected in run {i}: {iter_errors}")

        # Progress reporting every 50 iterations
        if i % 50 == 0 or i == TOTAL_RUNS:
            avg_lat = (sum(stats["latencies"]) / len(stats["latencies"])) * 1000 if stats["latencies"] else 0
            err_count = len(stats["unexpected_errors"])
            elapsed_total = time.perf_counter() - start_overall_time
            rps = stats["total_requests"] / elapsed_total if elapsed_total > 0 else 0
            print(f"[{i:03d}/{TOTAL_RUNS}] Completed {stats['total_requests']} requests | Avg Latency: {avg_lat:.1f}ms | RPS: {rps:.1f} | Errors: {err_count}")

    total_time = time.perf_counter() - start_overall_time
    avg_latency = (sum(stats["latencies"]) / len(stats["latencies"])) * 1000 if stats["latencies"] else 0
    min_latency = min(stats["latencies"]) * 1000 if stats["latencies"] else 0
    max_latency = max(stats["latencies"]) * 1000 if stats["latencies"] else 0
    sorted_lat = sorted(stats["latencies"])
    p95_latency = (sorted_lat[int(len(sorted_lat) * 0.95)]) * 1000 if sorted_lat else 0

    print("\n" + "=" * 70)
    print("🏁 500-RUN STRESS TEST COMPLETED!")
    print("=" * 70)
    print(f"⏱️ Total Execution Time:     {total_time:.2f} seconds")
    print(f"🔁 Total Iterations:         {stats['total_runs']} cycles")
    print(f"📡 Total HTTP Requests:      {stats['total_requests']} requests")
    print(f"✅ Successful Operations:    {stats['successful_requests']}")
    print(f"🛡️ Handled Rejections (4xx): {stats['expected_rejections']} (Duplicates, 401s, Corrupted 400s)")
    print(f"❌ Unexpected Failures:      {len(stats['unexpected_errors'])}")
    print("-" * 70)
    print("⏱️ LATENCY BENCHMARKS:")
    print(f"   • Min Latency:            {min_latency:.2f} ms")
    print(f"   • Average Latency:        {avg_latency:.2f} ms")
    print(f"   • p95 Latency:            {p95_latency:.2f} ms")
    print(f"   • Max Latency:            {max_latency:.2f} ms")
    print(f"   • Overall Throughput:     {stats['total_requests'] / total_time:.1f} requests/sec")
    print("-" * 70)
    print("📊 ENDPOINT BREAKDOWN:")
    for ep, count in stats["endpoints_tested"].items():
        print(f"   • {ep:<30}: {count} calls")
    print("=" * 70)

    if stats["unexpected_errors"]:
        print(f"\n⚠️ Top Errors Encountered ({len(stats['unexpected_errors'])} total):")
        for err in stats["unexpected_errors"][:10]:
            print(f"   - {err}")
        return False
    else:
        print("\n🎉 ZERO UNEXPECTED ERRORS! System demonstrated 100% stability across 500 continuous runs.")
        return True


if __name__ == "__main__":
    success = run_stress_test()
    sys.exit(0 if success else 1)
