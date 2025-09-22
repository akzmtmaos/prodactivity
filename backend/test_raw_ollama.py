#!/usr/bin/env python3
"""
Test script to show raw Ollama behavior
"""

import requests
import json

def test_raw_ollama():
    """Test raw Ollama behavior like ollama run"""
    
    # Test with completely raw prompt - no system instructions
    test_prompt = """Human: hello

Assistant:"""
    
    payload = {
        "model": "deepseek-r1:1.5b",
        "prompt": test_prompt,
        "stream": False  # Non-streaming for easier debugging
    }
    
    print("🧪 Testing Raw Ollama Behavior")
    print("=" * 50)
    print("📝 Raw Prompt (no system instructions):")
    print(test_prompt)
    print("\n" + "=" * 50)
    
    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            raw_response = result.get('response', '')
            print(f"✅ Raw Response: '{raw_response}'")
            print(f"📏 Response Length: {len(raw_response)}")
            print("\n🎯 This is exactly what you'll get in the AI Chat now!")
            print("✅ No system prompts")
            print("✅ No response cleaning")
            print("✅ No restrictions")
            print("✅ Raw Ollama behavior")
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_raw_ollama()
