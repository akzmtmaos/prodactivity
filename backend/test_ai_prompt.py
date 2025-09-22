#!/usr/bin/env python3
"""
Test script to see what prompt is being sent to the AI
"""

def test_prompt_format():
    """Test the prompt format being sent to AI"""
    
    # Simulate the conversation format
    messages = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "Hi! How can I assist you today? 😊"},
        {"role": "user", "content": "are you okay?"},
        {"role": "assistant", "content": "Hello! How can I assist you today?"},
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "Hello! I'm just a virtual assistant, so I don't have feelings, but I'm here and ready to help you with whatever you need. How can I assist you today? 😊"},
        {"role": "user", "content": "what is 2+3?"}
    ]
    
    # Format like the backend does
    conversation = []
    for msg in messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '').strip()
        
        if content:
            if role == 'user':
                conversation.append(f"Human: {content}")
            elif role == 'assistant':
                conversation.append(f"Assistant: {content}")
    
    formatted_prompt = "\n\n".join(conversation)
    
    print("🧪 Testing AI Prompt Format")
    print("=" * 60)
    print("📝 Formatted Prompt:")
    print(formatted_prompt)
    print("\n" + "=" * 60)
    print("❌ Issues:")
    print("- Too much conversation history")
    print("- AI is getting confused by repetitive responses")
    print("- No clear instruction format")
    print("\n✅ Solution:")
    print("- Limit conversation history")
    print("- Use proper instruction format")
    print("- Add simple system prompt")

if __name__ == "__main__":
    test_prompt_format()
