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
        }
    }
