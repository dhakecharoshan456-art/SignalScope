"""
Verification script for GenImage AI Detector API & Engine
"""
import io
from PIL import Image
from detector import GenImageDetector

def run_tests():
    print("=" * 50)
    print("Testing GenImageDetector Module")
    print("=" * 50)
    detector = GenImageDetector()
    
    # 1. Create a synthetic test image in memory
    img = Image.new("RGB", (256, 256), color=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    # 2. Test detection call
    res = detector.detect(jpeg_bytes, "test.jpg")
    print("\nDetection Result:")
    print(res)

    assert "prediction" in res, "Result must contain 'prediction'"
    assert "confidence" in res, "Result must contain 'confidence'"
    assert "explanation" in res, "Result must contain 'explanation'"
    assert "model" in res, "Result must contain 'model'"

    # 3. Test invalid non-image file
    print("\nTesting invalid file handling...")
    try:
        detector.detect(b"Not an image file content", "test.txt")
        print("FAIL: Should have raised ValueError")
    except ValueError as e:
        print("SUCCESS: Caught expected ValueError:", str(e))

    print("\nAll detector tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
