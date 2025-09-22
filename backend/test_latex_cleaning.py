#!/usr/bin/env python3
"""
Test script to show LaTeX cleaning behavior
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
    
    # Convert LaTeX math expressions to plain text
    cleaned = re.sub(r'\\boxed\{([^}]+)\}', r'\1', cleaned)  # \boxed{14} -> 14
    cleaned = re.sub(r'\\\[(.*?)\\\]', r'\1', cleaned)       # \[...\] -> content
    cleaned = re.sub(r'\\\((.*?)\\\)', r'\1', cleaned)       # \(...\) -> content
    cleaned = re.sub(r'\\\$([^$]+)\\\$', r'\1', cleaned)     # $...$ -> content
    
    # Clean up excessive whitespace
    cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)  # Max 2 newlines
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)           # Collapse spaces/tabs
    cleaned = cleaned.strip()
    
    return cleaned

def test_latex_cleaning():
    """Test the LaTeX cleaning function"""
    
    # Sample responses with various LaTeX formatting
    test_cases = [
        "The sum of 10 and 4 is \\boxed{14}.",
        "The answer is \\[10 + 4 = 14\\].",
        "Calculate \\(5 \\times 3\\) which equals \\$15\\$.",
        "Here's the result: \\boxed{42} and also \\[x = 5\\]."
    ]
    
    print("🧪 Testing LaTeX Cleaning")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"📝 Test Case {i}:")
        print(f"Original: {test_case}")
        
        cleaned = clean_ai_response(test_case)
        print(f"Cleaned:  {cleaned}")
        print()
    
    print("=" * 60)
    print("✅ LaTeX expressions converted to plain text:")
    print("- \\boxed{14} → 14")
    print("- \\[...\\] → content")
    print("- \\(...\\) → content") 
    print("- \\$...\\$ → content")

if __name__ == "__main__":
    test_latex_cleaning()
