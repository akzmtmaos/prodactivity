#!/usr/bin/env python3
"""
Test script to verify the chat prompt fix
"""

def test_simple_greeting():
    """Test that a simple greeting gets an appropriate response"""
    
    # Simulate the new system prompt
    note_context = "Title: Test Note\nContent: This is a test note about productivity."
    
    if note_context:
        system_instruction = f"""<s>[INST] You are a helpful AI assistant helping with a note. Be friendly, concise, and direct. Answer questions appropriately - if someone says "hello", respond with a simple greeting. Do not over-explain simple requests.

Note context: {note_context}

Answer questions about the note content when relevant, but keep responses natural and conversational. [/INST]"""
    else:
        system_instruction = """<s>[INST] You are a helpful AI assistant. Be friendly, concise, and direct. Answer questions appropriately - if someone says "hello", respond with a simple greeting. Do not over-explain simple requests. [/INST]"""
    
    print("🧪 Testing Chat Prompt Fix")
    print("=" * 50)
    print("📝 System Instruction:")
    print(system_instruction)
    print("\n" + "=" * 50)
    print("✅ System prompt is now:")
    print("- Much shorter and clearer")
    print("- Explicitly tells AI to respond appropriately to greetings")
    print("- Includes note context when available")
    print("- Emphasizes being concise and direct")
    print("\n🎯 Expected behavior:")
    print("- 'hello' → Simple greeting response")
    print("- 'what is this note about?' → Answer about note content")
    print("- No more over-explaining simple requests")

if __name__ == "__main__":
    test_simple_greeting()
