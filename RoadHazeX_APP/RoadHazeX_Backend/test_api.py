import requests


print("Sending POST request to http://localhost:5000/predict ...")
try:
    with open('test_img.jpg', 'rb') as f:
        response = requests.post('http://localhost:5000/predict', files={'image': f})
        
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error connecting to API: {e}")
