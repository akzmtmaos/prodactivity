#!/usr/bin/env python3
"""
Test script to verify AI flashcard generation integration
"""

import requests
import json
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_ai_flashcard_generation():
    """Test the AI flashcard generation endpoint"""
    
    print("🧪 Testing AI Flashcard Generation Integration...")
    
    # Test data
    test_content = """
    Title: Python Basics
    
    Python is a high-level programming language known for its simplicity and readability.
    
    Variables in Python:
    - Variables are containers for storing data values
    - No need to declare variables with a particular type
    - Example: x = 5, name = "John"
    
    Data Types:
    - String: text data enclosed in quotes
    - Integer: whole numbers
    - Float: decimal numbers
    - Boolean: True or False values
    
    Functions:
    - Functions are reusable blocks of code
    - Defined using the 'def' keyword
    - Can accept parameters and return values
    """
    
    # Test the preview endpoint
    print("\n1. Testing AI Preview Endpoint...")
    try:
        response = requests.post(
            "http://localhost:8000/api/decks/ai/preview-flashcards/",
            json={
                "content": test_content,
                "title": "Python Basics",
                "strategy": "ai_enhanced"
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer test-token"  # This will fail auth, but we can test the endpoint structure
            },
            timeout=30
        )
        
        if response.status_code == 401:
            print("✅ Preview endpoint is accessible (authentication required as expected)")
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Preview endpoint working! Generated {data.get('count', 0)} flashcards")
            if 'flashcards' in data:
                for i, card in enumerate(data['flashcards'][:2]):
                    print(f"   Card {i+1}: Q: {card['question'][:50]}...")
        else:
            print(f"⚠️  Preview endpoint returned status {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Django server. Make sure the server is running.")
        return False
    except Exception as e:
        print(f"❌ Error testing preview endpoint: {e}")
        return False
    
    # Test direct Ollama connection
    print("\n2. Testing Direct Ollama Connection...")
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "deepseek-r1:1.5b",
                "prompt": "Create 2 flashcards about Python variables. Format as JSON array with 'question' and 'answer' fields.",
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 500
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '').strip()
            print("✅ Ollama connection working!")
            print(f"📝 AI Response preview: {ai_response[:100]}...")
            
            # Try to parse JSON from response
            try:
                import re
                json_match = re.search(r'\[.*?\]', ai_response, re.DOTALL)
                if json_match:
                    flashcards = json.loads(json_match.group())
                    print(f"✅ Successfully parsed {len(flashcards)} flashcards from AI response")
                    for i, card in enumerate(flashcards[:2]):
                        print(f"   Flashcard {i+1}: {card.get('question', 'N/A')[:50]}...")
                else:
                    print("⚠️  No JSON array found in AI response")
            except json.JSONDecodeError:
                print("⚠️  Could not parse JSON from AI response")
                
        else:
            print(f"❌ Ollama API error: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Ollama. Make sure Ollama is running with deepseek-r1:1.5b model.")
        return False
    except Exception as e:
        print(f"❌ Error testing Ollama: {e}")
        return False
    
    print("\n✅ AI Flashcard Integration Test Complete!")
    print("\nNext steps:")
    print("1. Make sure Django server is running: python manage.py runserver")
    print("2. Make sure Ollama is running with deepseek-r1:1.5b model")
    print("3. Set up AI configurations: python manage.py setup_ai_configs")
    print("4. Test the full workflow through the frontend")
    
    return True

if __name__ == "__main__":
    test_ai_flashcard_generation()
