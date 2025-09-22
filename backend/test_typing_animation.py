#!/usr/bin/env python3
"""
Test script to verify typing animation works with streaming
"""

import requests
import json
import time

def test_streaming_typing():
    """Test streaming response to simulate typing animation"""
    
    # Test with a simple prompt
    test_prompt = """Human: what is 10+4?

Assistant:"""
    
    payload = {
        "model": "deepseek-r1:1.5b",
        "prompt": test_prompt,
        "stream": True
    }
    
    print("🧪 Testing Streaming Typing Animation")
    print("=" * 60)
    print("📝 Test Prompt:")
    print(test_prompt)
    print("\n" + "=" * 60)
    print("🎬 Simulating typing animation:")
    print()
    
    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=30, stream=True)
        
        if response.status_code == 200:
            full_response = ""
            accumulated_clean = ""
            
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if 'response' in data:
                            chunk = data['response']
                            full_response += chunk
                            
                            # Simulate the cleaning function
                            import re
                            def clean_ai_response(response_text):
                                if not response_text:
                                    return ""
                                cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
                                cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)
                                cleaned = re.sub(r'\\boxed\{([^}]+)\}', r'\1', cleaned)
                                cleaned = re.sub(r'\\\[(.*?)\\\]', r'\1', cleaned)
                                cleaned = re.sub(r'\\\((.*?)\\\)', r'\1', cleaned)
                                cleaned = re.sub(r'\\\$([^$]+)\\\$', r'\1', cleaned)
                                cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
                                cleaned = re.sub(r'[ \t]+', ' ', cleaned)
                                return cleaned.strip()
                            
                            current_clean = clean_ai_response(full_response)
                            
                            if len(current_clean) > len(accumulated_clean):
                                new_content = current_clean[len(accumulated_clean):]
                                if new_content.strip():
                                    print(new_content, end='', flush=True)
                                    accumulated_clean = current_clean
                                    time.sleep(0.05)  # Simulate typing delay
                            
                        if data.get('done', False):
                            break
                    except json.JSONDecodeError:
                        continue
            
            print("\n\n" + "=" * 60)
            print("✅ Typing animation simulation complete!")
            print("🎯 This is how it should appear in the frontend")
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_streaming_typing()
