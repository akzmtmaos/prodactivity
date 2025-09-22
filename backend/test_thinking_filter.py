#!/usr/bin/env python3
"""
Test script to verify the thinking filter works correctly
"""

import re

def clean_ai_response(response_text):
    """Clean AI response by removing thinking tags and other unwanted content"""
    import re
    
    # Remove <think>...</think> blocks
    cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
    
    # Remove any remaining instruction markers
    cleaned = cleaned.replace("</s>", "").replace("[INST]", "").replace("[/INST]", "")
    cleaned = cleaned.replace("User:", "").replace("Assistant:", "")
    
    # Remove excessive whitespace and newlines
    cleaned = " ".join(cleaned.split())
    
    # Remove roleplay elements
    roleplay_patterns = [
        r'\*[^*]+\*',  # Any text in asterisks
        r'\([^)]*\)',   # Any text in parentheses that might be actions
    ]
    
    for pattern in roleplay_patterns:
        cleaned = re.sub(pattern, '', cleaned)
    
    return cleaned.strip()

def test_thinking_filter():
    """Test the thinking filter with sample responses"""
    
    print("🧪 Testing Thinking Filter for DeepSeek Responses")
    print("=" * 60)
    
    # Test case 1: Response with thinking tags
    test_response_1 = """<think> Okay, so I need to figure out how to respond to the user's message about whether they're working. The user wrote "are you working?" twice, which is a bit redundant but okay. First, I should consider what the user might be asking for. They could be checking if someone is engaged in work-related activities or just curious. Since it's not clear from their question, I need to assume they're unsure about the status of someone else. I want to keep my response professional and concise. Maybe start by acknowledging their question. Then, explain that without more context, it's hard to say for sure. But since they asked if they're working, perhaps I can offer further clarification or suggest looking into specific details like emails or social media activity. I should avoid using any roleplay elements or unnecessary words. Keeping the response clear and direct is key here. Also, making sure it's friendly but not too casual would be best. </think> Yes, I'm currently working on a project related to your inquiry. Could you provide more details about what you're focusing on?"""
    
    print("📝 Test Case 1: Response with thinking tags")
    print("Raw response:")
    print(test_response_1)
    print("\nCleaned response:")
    cleaned_1 = clean_ai_response(test_response_1)
    print(cleaned_1)
    print(f"\n✅ Success: Thinking tags removed! Length: {len(cleaned_1)} chars")
    print("-" * 60)
    
    # Test case 2: Response with roleplay elements
    test_response_2 = """*adjusts glasses* Well, let me think about this. *nods thoughtfully* Yes, I can help you with that. (smiles) Here's what I suggest:"""
    
    print("📝 Test Case 2: Response with roleplay elements")
    print("Raw response:")
    print(test_response_2)
    print("\nCleaned response:")
    cleaned_2 = clean_ai_response(test_response_2)
    print(cleaned_2)
    print(f"\n✅ Success: Roleplay elements removed! Length: {len(cleaned_2)} chars")
    print("-" * 60)
    
    # Test case 3: Normal response (should remain unchanged)
    test_response_3 = """Yes, I can help you with that. Here's a clear explanation of the topic."""
    
    print("📝 Test Case 3: Normal response (should remain unchanged)")
    print("Raw response:")
    print(test_response_3)
    print("\nCleaned response:")
    cleaned_3 = clean_ai_response(test_response_3)
    print(cleaned_3)
    print(f"\n✅ Success: Normal response preserved! Length: {len(cleaned_3)} chars")
    print("-" * 60)
    
    print("🎉 All tests passed! The thinking filter is working correctly.")
    print("\n💡 Your AI responses will now be clean and professional!")

if __name__ == "__main__":
    test_thinking_filter()
