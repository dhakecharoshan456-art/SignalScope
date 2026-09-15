"""
Test HTTP POST /api/detect endpoint
"""
import io
import requests
from PIL import Image

def test_endpoint():
    url = "http://localhost:8080/api/detect"

    print("1. Testing valid JPEG upload via POST /api/detect...")
    img = Image.new("RGB", (300, 300), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {'image': ('sample.jpg', buf, 'image/jpeg')}
    res = requests.post(url, files=files)
    print("Status:", res.status_code)
    data = res.json()
    print("Response JSON:", data)
    assert res.status_code == 200
    assert data['prediction'] in ['REAL', 'AI-GENERATED']
    assert 0 <= data['confidence'] < 100.0, "Confidence must never be >= 100%"
    assert len(data['explanation']) > 0

    print("\n2. Testing valid PNG upload via POST /api/detect...")
    buf_png = io.BytesIO()
    img.save(buf_png, format="PNG")
    buf_png.seek(0)
    files_png = {'image': ('sample.png', buf_png, 'image/png')}
    res_png = requests.post(url, files=files_png)
    print("Status:", res_png.status_code)
    data_png = res_png.json()
    print("Response JSON:", data_png)
    assert res_png.status_code == 200

    print("\n3. Testing invalid non-image file upload via POST /api/detect...")
    bad_buf = io.BytesIO(b"Hello world this is not an image file")
    files_bad = {'image': ('corrupt.jpg', bad_buf, 'image/jpeg')}
    res_bad = requests.post(url, files=files_bad)
    print("Status:", res_bad.status_code)
    print("Error JSON:", res_bad.json())
    assert res_bad.status_code == 400
    assert "error" in res_bad.json()

    print("\n4. Testing unsupported file extension (e.g. sample.txt)...")
    txt_buf = io.BytesIO(b"Simple text file")
    files_txt = {'image': ('notes.txt', txt_buf, 'text/plain')}
    res_txt = requests.post(url, files=files_txt)
    print("Status:", res_txt.status_code)
    print("Error JSON:", res_txt.json())
    assert res_txt.status_code == 400

    print("\nAll HTTP /api/detect tests PASSED successfully!")

if __name__ == "__main__":
    test_endpoint()
