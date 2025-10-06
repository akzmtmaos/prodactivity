from .models import AIConfiguration

def get_ai_config(config_type: str, **kwargs):
    """
    Get AI configuration from database and format the prompt with given parameters.
    
    Args:
        config_type: The type of configuration (e.g., 'reviewer_prompt', 'quiz_prompt')
        **kwargs: Parameters to format the prompt template
    
    Returns:
        str: The formatted prompt
        
    Raises:
        ValueError: If configuration not found or parameters missing
    """
    try:
        config = AIConfiguration.objects.get(config_type=config_type, is_active=True)
        return config.get_prompt(**kwargs)
    except AIConfiguration.DoesNotExist:
        raise ValueError(f"Active AI configuration for '{config_type}' not found. Please create one in Django Admin.")
    except ValueError as e:
        raise ValueError(f"Error formatting prompt for '{config_type}': {e}")

def get_default_prompts():
    """
    Get default prompt templates for initial setup.
    Returns a dictionary of default prompts for each config type.
    """
    return {
        'reviewer_prompt': {
            'title': 'Default Reviewer Generation Prompt',
            'description': 'Default prompt for generating reviewer content from text',
            'prompt_template': """Review the following content and provide your response in the following format:

Summary:

[Write a concise summary here]

Terminology:

- [List important terminologies with brief explanations as bullet points]

Key Points:

- [List key points and main ideas as bullet points]

Main Idea:

- [State the main idea(s) as bullet points]

Leave one blank line between each section. Use bullet points for lists.

Content:
{content}"""
        },
        'quiz_prompt': {
            'title': 'Default Quiz Generation Prompt',
            'description': 'Default prompt for generating quiz questions from content using Bloom\'s Taxonomy',
            'prompt_template': """You are an educational expert. Generate exactly {question_count} multiple choice questions based on the following content. Do NOT output any CSS, JSON configuration, or technical data. Only output quiz questions.

**IMPORTANT: Output ONLY quiz questions in this exact format:**

Q1. What is the main topic discussed in this content?
A) Option A text here
B) Option B text here  
C) Option C text here
D) Option D text here
Correct Answer: A

Q2. According to the content, which statement is true?
A) Option A text here
B) Option B text here
C) Option C text here
D) Option D text here
Correct Answer: B

[Continue for Q3 through Q{question_count}...]

**Requirements:**
- Generate exactly {question_count} questions
- Each question must have 4 options (A, B, C, D)
- Include "Correct Answer: [letter]" after each question
- Base questions on the actual content provided
- Make questions educational and meaningful
- Do NOT include any CSS, JSON, or technical configuration data

Content to analyze:
{content}"""
        },
        'summary_prompt': {
            'title': 'Default Content Summary Prompt',
            'description': 'Default prompt for summarizing content',
            'prompt_template': """Please provide a concise summary of the following content in 2-3 paragraphs:

{content}"""
        },
        'chat_prompt': {
            'title': 'Default AI Chat Prompt',
            'description': 'Default prompt for AI chat interactions',
            'prompt_template': """{message}"""
        },
        'flashcard_prompt': {
            'title': 'Default Flashcard Generation Prompt',
            'description': 'Default prompt for generating flashcards from content using AI',
            'prompt_template': """Generate flashcards in this EXACT format:

Q: [DESCRIPTION]
A: [TERM]

EXAMPLES:
Q: Hides internal data and only exposes necessary information
A: Encapsulation

Q: Allows one class to inherit properties and methods from another class
A: Inheritance

Q: A blueprint that defines the structure and behavior of objects
A: Class

Q: Focuses on what an object does, not how it does it
A: Abstraction

Q: Same method name, different behavior based on the object
A: Polymorphism

Q: A real instance of a class
A: Object

RULES:
- Question = Description only
- Answer = Single term only
- NO explanations in answers
- NO code examples
- Generate 5-10 flashcards

Content: {content}

Generate flashcards:"""
        },
        'flashcard_qa_prompt': {
            'title': 'Q&A Pattern Flashcard Prompt',
            'description': 'Prompt for generating flashcards from Q&A formatted content',
            'prompt_template': """STOP! DO NOT CREATE QUESTIONS! CREATE DEFINITION-TERM FLASHCARDS!

You must create flashcards in this EXACT format:
- FRONT: The definition/explanation (NO QUESTIONS!)
- BACK: The term name (NO ANSWERS!)

FORBIDDEN: Do NOT use "Q:", "What is", "Define", "Explain", "How does" or any question format!

REQUIRED FORMAT:
{{
  "flashcards": [
    {{
      "front": "Focuses on the behavior of an object without detailing its internal workings",
      "back": "Abstraction"
    }},
    {{
      "front": "Allows methods to be called on objects of different classes with different implementations",
      "back": "Polymorphism"
    }},
    {{
      "front": "Hides internal data and only exposes necessary information",
      "back": "Encapsulation"
    }},
    {{
      "front": "Allows one class to inherit properties and methods from another class",
      "back": "Inheritance"
    }},
    {{
      "front": "A blueprint that defines the structure and behavior of objects",
      "back": "Class"
    }},
    {{
      "front": "A real instance or implementation of a class",
      "back": "Object"
    }}
  ]
}}

Content Title: {title}

Content:
{content}

CRITICAL RULES:
1. NEVER start with "Q:" or "What is" or "Define" or "Explain"
2. FRONT must be a definition/explanation, NOT a question
3. BACK must be a single term name, NOT an answer
4. NO question marks anywhere
5. NO "What", "How", "Why", "Define", "Explain" in the front
6. Extract key programming concepts and their definitions
7. Make definitions clear and descriptive
8. Keep terms short and specific

Create 5-10 flashcards following this EXACT pattern. Respond ONLY with valid JSON:"""
        },
        'flashcard_heading_prompt': {
            'title': 'Heading Pattern Flashcard Prompt',
            'description': 'Prompt for generating flashcards from content with headings',
            'prompt_template': """STOP! DO NOT CREATE QUESTIONS! CREATE DEFINITION-TERM FLASHCARDS!

You must create flashcards in this EXACT format:
- FRONT: The definition/explanation (NO QUESTIONS!)
- BACK: The term name (NO ANSWERS!)

FORBIDDEN: Do NOT use "Q:", "What is", "Define", "Explain", "How does" or any question format!

REQUIRED FORMAT:
{{
  "flashcards": [
    {{
      "front": "Focuses on the behavior of an object without detailing its internal workings",
      "back": "Abstraction"
    }},
    {{
      "front": "Allows methods to be called on objects of different classes with different implementations",
      "back": "Polymorphism"
    }},
    {{
      "front": "Hides internal data and only exposes necessary information",
      "back": "Encapsulation"
    }},
    {{
      "front": "Allows one class to inherit properties and methods from another class",
      "back": "Inheritance"
    }},
    {{
      "front": "A blueprint that defines the structure and behavior of objects",
      "back": "Class"
    }},
    {{
      "front": "A real instance or implementation of a class",
      "back": "Object"
    }}
  ]
}}

Content Title: {title}

Content:
{content}

CRITICAL RULES:
1. NEVER start with "Q:" or "What is" or "Define" or "Explain"
2. FRONT must be a definition/explanation, NOT a question
3. BACK must be a single term name, NOT an answer
4. NO question marks anywhere
5. NO "What", "How", "Why", "Define", "Explain" in the front
6. Extract key programming concepts and their definitions
7. Make definitions clear and descriptive
8. Keep terms short and specific

Create 5-10 flashcards following this EXACT pattern. Respond ONLY with valid JSON:"""
        },
        'smart_chunking_prompt': {
            'title': 'Smart Chunking Analysis Prompt',
            'description': 'Advanced prompt for analyzing content and suggesting optimal note chunking strategies',
            'prompt_template': """You are an expert learning strategist and content analyst. Analyze the following content and suggest how to break it down into multiple focused notes for optimal learning and retention.

Content Analysis Guidelines:
1. Identify logical topic divisions and natural breakpoints
2. Consider cognitive load and information processing limits
3. Balance between comprehensive coverage and manageable chunks
4. Group related concepts that should be studied together
5. Consider prerequisite relationships between concepts
6. Optimize for spaced repetition and active recall

Topic: {topic}
Content: {content}

Please respond with ONLY a JSON object in this exact format:
{{
    "suggested_chunks": [
        {{
            "title": "Clear, descriptive title for this note",
            "content_preview": "Brief preview of what this note would contain (2-3 sentences)",
            "key_concepts": ["concept1", "concept2", "concept3"],
            "estimated_length": "short|medium|long",
            "priority": "low|medium|high",
            "prerequisites": ["note_title_1", "note_title_2"],
            "learning_objectives": ["objective1", "objective2"],
            "difficulty_level": "beginner|intermediate|advanced"
        }}
    ],
    "total_notes_suggested": 3,
    "reasoning": "Detailed explanation of why this chunking approach was chosen, including learning theory principles",
    "study_recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2"
    ],
    "chunking_strategy": "sequential|hierarchical|modular|mixed",
    "estimated_study_time": "X hours total",
    "content_complexity": "low|medium|high"
}}"""
        }
    }
