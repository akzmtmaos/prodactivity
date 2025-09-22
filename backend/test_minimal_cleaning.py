#!/usr/bin/env python3
"""
Test script to show minimal cleaning behavior
"""

import re

def clean_ai_response(response_text):
    """Minimal cleaning - only remove thinking tags and fix formatting"""
    import re
    
    if not response_text:
        return ""
    
    # Remove <think>...</think> blocks
    cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
    
    # Remove markdown bold formatting that's not wanted
    cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)  # Remove **bold** but keep content
    
    # Clean up excessive whitespace
    cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)  # Max 2 newlines
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)           # Collapse spaces/tabs
    cleaned = cleaned.strip()
    
    return cleaned

def test_minimal_cleaning():
    """Test the minimal cleaning function"""
    
    # Sample response with thinking tags and formatting issues
    sample_response = """<think>
Okay, the user asked "what is 10 + 4?" which is a simple arithmetic question. My goal is to provide a clear and helpful response.

First, I'll acknowledge their question and explain that addition is the process of combining numbers together. Since they're asking for a straightforward answer, I can solve it quickly without needing complicated methods or multiple steps.

I should present the calculation clearly and concisely, making sure the user understands how to add 10 and 4 together. If this were part of a larger problem, I might consider offering more information, but since they've only provided this question, I'll stick to solving it as given.

It's also a good idea to offer further assistance in case they have more questions or need help with something else! Let me know if that works best.
</think>

Sure! 

**Question:** What is \\(10 + 4\\)?

To solve this, simply add the two numbers together:

\\[
10 + 4 = 14
\\]

So, the sum of \\(10 + 4\\) is **14**.

If you have any more questions or need help with something else, feel free to ask! 😊"""
    
    print("🧪 Testing Minimal Cleaning")
    print("=" * 60)
    print("📝 Original Response:")
    print(sample_response)
    print("\n" + "=" * 60)
    
    cleaned_response = clean_ai_response(sample_response)
    
    print("🧹 Cleaned Response:")
    print(cleaned_response)
    print("\n" + "=" * 60)
    print("✅ What was removed:")
    print("- <think>...</think> blocks")
    print("- **bold** markdown formatting")
    print("- Excessive whitespace")
    print("\n✅ What was kept:")
    print("- All the actual content")
    print("- Mathematical expressions")
    print("- Emojis and formatting")
    print("- Natural conversation flow")

if __name__ == "__main__":
    test_minimal_cleaning()
