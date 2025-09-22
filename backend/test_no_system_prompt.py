#!/usr/bin/env python3
"""
Test script to verify no system prompt approach
"""

import requests
import json

def test_no_system_prompt():
    """Test with no system prompt"""
    
    # Test with no system prompt
    test_prompt = """Human: what is 2+3?"""
    
    payload = {
        "model": "deepseek-r1:1.5b",
        "prompt": test_prompt,
        "stream": False
    }
    
    print("🧪 Testing No System Prompt")
    print("=" * 60)
    print("📝 Prompt:")
    print(test_prompt)
    print("\n" + "=" * 60)
    
    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            raw_response = result.get('response', '')
            print(f"✅ Raw Response: '{raw_response}'")
            
            # Test cleaning
            import re
            def clean_ai_response(response_text):
                if not response_text:
                    return ""
                cleaned = re.sub(r'<think>.*?(</think>|$)', '', response_text, flags=re.DOTALL)
                cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)
                cleaned = re.sub(r'\\boxed\{([^}]*)\}', r'\1', cleaned)
                cleaned = re.sub(r'\\\[(.*?)\\\]', r'\1', cleaned)
                cleaned = re.sub(r'\\\((.*?)\\\)', r'\1', cleaned)
                cleaned = re.sub(r'\\\$([^$]*)\\\$', r'\1', cleaned)
                cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
                cleaned = re.sub(r'[ \t]+', ' ', cleaned)
                return cleaned.strip()
            
            cleaned_response = clean_ai_response(raw_response)
            print(f"🧹 Cleaned Response: '{cleaned_response}'")
            
            # Check if response is short and direct
            if len(cleaned_response) < 50 and "5" in cleaned_response:
                print("✅ SUCCESS: AI gave a short, direct answer!")
            else:
                print("❌ FAILED: AI gave a verbose response")
                print(f"Response length: {len(cleaned_response)} characters")
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_no_system_prompt()
