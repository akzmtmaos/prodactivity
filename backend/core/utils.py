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
            'prompt_template': """You are an educational expert. Generate exactly 10 multiple choice questions based on the following content. Do NOT output any CSS, JSON configuration, or technical data. Only output quiz questions.

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

[Continue for Q3 through Q10...]

**Requirements:**
- Generate exactly 10 questions
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
            'prompt_template': """You are a helpful AI assistant. Please respond to the following user message in a helpful and informative way:

User: {message}

Assistant:"""
        },
        'flashcard_prompt': {
            'title': 'Default Flashcard Generation Prompt',
            'description': 'Default prompt for generating flashcards from content using AI',
            'prompt_template': """You are an expert at creating educational flashcards. Convert the following content into high-quality flashcards.

Instructions:
1. Create 5-10 flashcards that cover the most important concepts
2. Make questions clear and specific
3. Provide comprehensive but concise answers
4. Focus on key facts, definitions, and important details
5. Format your response as a JSON array of objects with "question" and "answer" fields

Example format:
[
  {
    "question": "What is the main concept?",
    "answer": "The main concept is..."
  }
]

Content Title: {title}

Content:
{content}

Generate flashcards now:"""
        },
        'flashcard_qa_prompt': {
            'title': 'Q&A Pattern Flashcard Prompt',
            'description': 'Prompt for generating flashcards from Q&A formatted content',
            'prompt_template': """You are an expert at creating educational flashcards. The following content appears to be in Q&A format. Extract and enhance the question-answer pairs to create high-quality flashcards.

Instructions:
1. Identify existing Q&A patterns in the content
2. Enhance questions to be clear and specific
3. Improve answers to be comprehensive but concise
4. Create additional flashcards for important concepts not in Q&A format
5. Format your response as a JSON array of objects with "question" and "answer" fields

Content Title: {title}

Content:
{content}

Generate flashcards now:"""
        },
        'flashcard_heading_prompt': {
            'title': 'Heading Pattern Flashcard Prompt',
            'description': 'Prompt for generating flashcards from content with headings',
            'prompt_template': """You are an expert at creating educational flashcards. The following content has headings and structured information. Convert headings into questions and their content into answers.

Instructions:
1. Use headings as the basis for questions
2. Convert heading content into comprehensive answers
3. Create additional flashcards for important sub-concepts
4. Make questions clear and specific
5. Format your response as a JSON array of objects with "question" and "answer" fields

Content Title: {title}

Content:
{content}

Generate flashcards now:"""
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
