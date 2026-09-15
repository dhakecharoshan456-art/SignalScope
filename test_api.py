import urllib.request
import urllib.error
import os

img_path = 'sample_test.png'

print("Testing with image:", img_path)
with open(img_path, 'rb') as f:
    img_bytes = f.read()

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
header = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="image"; filename="{os.path.basename(img_path)}"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8')
footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
data = header + img_bytes + footer

req = urllib.request.Request(
    'http://localhost:8080/api/detect',
    data=data,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Response Code:", resp.status)
        print("Response Body:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode('utf-8'))
