#!/usr/bin/env python3
"""
Test script to debug the chat issue
"""

import requests
import json

def test_simple_chat():
    """Test a simple chat request"""
    
    # Test with minimal prompt
    test_prompt = """<s>[INST] You are a helpful AI assistant. [/INST]
<s>[INST] hello [/INST]"""
    
    payload = {
        "model": "deepseek-r1:1.5b",
        "prompt": test_prompt,
        "stream": False,  # Non-streaming for easier debugging
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 50,
            "num_predict": 100,
            "repeat_penalty": 1.1,
            "stop": ["</s>", "[INST]", "[/INST]"]
        }
    }
    
    print("🧪 Testing Simple Chat with DeepSeek")
    print("=" * 50)
    print("📝 Test Prompt:")
    print(test_prompt)
    print("\n" + "=" * 50)
    
    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            raw_response = result.get('response', '')
            print(f"✅ Raw Response: '{raw_response}'")
            print(f"📏 Response Length: {len(raw_response)}")
            
            # Test our cleaning function
            import re
            
            def clean_ai_response(response_text):
                if not response_text:
                    return ""
                
                # Remove <think>...</think> blocks
                cleaned = re.sub(r'<think>.*?(</think>|$)', '', response_text, flags=re.DOTALL)
                
                # Remove instruction markers
                cleaned = cleaned.replace("</s>", "").replace("[INST]", "").replace("[/INST]", "")
                cleaned = cleaned.replace("User:", "").replace("Assistant:", "")
                
                # Clean whitespace
                cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
                cleaned = re.sub(r'[ \t]+', ' ', cleaned)
                cleaned = cleaned.strip()
                
                return cleaned
            
            cleaned_response = clean_ai_response(raw_response)
            print(f"🧹 Cleaned Response: '{cleaned_response}'")
            print(f"📏 Cleaned Length: {len(cleaned_response)}")
            
            if len(cleaned_response.strip()) < 1:
                print("❌ ISSUE: Cleaned response is empty!")
            else:
                print("✅ Cleaned response looks good!")
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_simple_chat()
