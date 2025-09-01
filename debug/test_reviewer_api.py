import requests
import json

# Test the reviewer endpoints
BASE_URL = "http://127.0.0.1:8000/api/notes"

def test_reviewer_endpoints():
    # Get auth token (you'll need to replace with a valid token)
    print("Testing Reviewer API endpoints...")
    
    # Test 1: Check if reviewers endpoint exists
    try:
        response = requests.get(f"{BASE_URL}/reviewers/")
        print(f"Reviewers endpoint status: {response.status_code}")
        if response.status_code == 404:
            print("Reviewers endpoint not found - migration may be needed")
        elif response.status_code == 401:
            print("Authentication required")
        else:
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"Error testing reviewers endpoint: {e}")
    
    # Test 2: Check if AI reviewer endpoint exists
    try:
        response = requests.post(f"{BASE_URL}/ai-reviewer/", json={
            "text": "Test content",
            "reviewer_type": "quiz",
            "difficulty_level": "medium"
        })
        print(f"AI Reviewer endpoint status: {response.status_code}")
        if response.status_code == 404:
            print("AI Reviewer endpoint not found")
        elif response.status_code == 401:
            print("Authentication required for AI endpoint")
        else:
            print(f"AI Response: {response.text[:200]}")
    except Exception as e:
        print(f"Error testing AI reviewer endpoint: {e}")

if __name__ == "__main__":
    test_reviewer_endpoints() 