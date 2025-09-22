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
            'description': 'Default prompt for generating quiz questions from content',
            'prompt_template': """Generate 5 multiple choice questions based on the following content. Format each question as:

Q1. [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [A/B/C/D]

Content:
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
        }
    }
