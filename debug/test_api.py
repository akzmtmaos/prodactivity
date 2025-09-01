import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_URL = "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta"
headers = {
    "Authorization": f"Bearer {os.getenv('HUGGINGFACE_API_TOKEN')}",
    "Content-Type": "application/json"
}

def query(payload):
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Text: {response.text}")
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Request failed with status code {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

output = query({
    "inputs": "What is the capital of France?",
    "parameters": {
        "max_new_tokens": 100
    }
})

print("\nFinal Output:")
print(json.dumps(output, indent=2)) 