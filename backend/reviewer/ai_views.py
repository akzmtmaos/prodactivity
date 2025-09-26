from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import requests
import logging
from .serializers import ReviewerSerializer
from rest_framework.decorators import api_view, permission_classes
from .models import Reviewer
from core.utils import get_ai_config

logger = logging.getLogger(__name__)

OLLAMA_API_URL = 'http://localhost:11434/api/generate'
OLLAMA_MODEL = 'deepseek-r1:1.5b'

def analyze_content_type(content):
    """Analyze content to determine its structure and type for optimal reviewer generation"""
    import re
    
    content_lower = content.lower()
    
    # Check for Q&A patterns
    qa_patterns = [
        r'q\d*[\.\)]\s*',  # Q1., Q2), etc.
        r'question\s*\d*[\.\)]\s*',  # Question 1., Question 2), etc.
        r'^\s*[a-d][\.\)]\s+',  # A), B), C), D) options
        r'answer\s*:',  # Answer: patterns
    ]
    
    qa_score = sum(1 for pattern in qa_patterns if re.search(pattern, content, re.MULTILINE | re.IGNORECASE))
    
    # Check for question-heavy content (like helpdesk FAQs)
    question_patterns = [
        r'^[^?]*\?$',  # Lines ending with question marks
        r'what\s+',  # Lines starting with "what"
        r'how\s+',   # Lines starting with "how"
        r'where\s+', # Lines starting with "where"
        r'when\s+',  # Lines starting with "when"
        r'why\s+',   # Lines starting with "why"
    ]
    
    question_count = sum(1 for pattern in question_patterns if re.search(pattern, content, re.MULTILINE | re.IGNORECASE))
    
    # If content has many questions, treat it as Q&A content
    if question_count >= 3:
        qa_score += question_count
    
    # Check for structured content (headings, lists, etc.)
    structured_patterns = [
        r'^\s*#{1,6}\s+',  # Markdown headers (with optional leading whitespace)
        r'^\s*\d+\.\s+',  # Numbered lists (with optional leading whitespace)
        r'^\s*[-*]\s+',  # Bullet points (with optional leading whitespace)
        r'^\s*[A-Z][A-Z\s]+:',  # ALL CAPS headers
        r'^\s*##\s+',  # Markdown level 2 headers (with optional leading whitespace)
        r'^\s*###\s+',  # Markdown level 3 headers (with optional leading whitespace)
    ]
    
    structured_score = sum(1 for pattern in structured_patterns if re.search(pattern, content, re.MULTILINE))
    
    # Check for lecture/educational content
    educational_keywords = [
        'definition', 'concept', 'theory', 'principle', 'example', 'explanation',
        'important', 'key point', 'note that', 'remember', 'understand'
    ]
    
    educational_score = sum(1 for keyword in educational_keywords if keyword in content_lower)
    
    # Check for meeting notes
    meeting_keywords = [
        'agenda', 'action item', 'discussion', 'decision', 'next steps',
        'attendees', 'meeting', 'minutes', 'follow up'
    ]
    
    meeting_score = sum(1 for keyword in meeting_keywords if keyword in content_lower)
    
    # Determine content type (prioritize specific types over general structured)
    if qa_score >= 2:
        return 'qa', qa_score
    elif meeting_score >= 2:
        return 'meeting', meeting_score
    elif educational_score >= 3:
        return 'educational', educational_score
    elif structured_score >= 2:  # Lowered threshold for structured content
        return 'structured', structured_score
    else:
        return 'general', 0

def get_adaptive_prompt(content_type, content, note_type=None):
    """Get adaptive prompt based on content analysis"""
    
    if content_type == 'qa':
        return f"""You are an expert study assistant. Create a comprehensive study reviewer from the Q&A content below.

CRITICAL REQUIREMENTS:
- Follow the EXACT format specified below
- Include ALL sections in the correct order
- Do NOT generate new questions
- Focus on organizing and explaining the existing content
- Provide detailed explanations and context

You MUST format your response EXACTLY as follows with proper line breaks:

Summary:

[Write a comprehensive summary of the main topics covered - 2-3 paragraphs]

Terminology:

- [Term 1]: [Clear definition and explanation]
- [Term 2]: [Clear definition and explanation]
- [Term 3]: [Clear definition and explanation]
- [Continue with all important terms from the content]

Key Points:

- [Main point 1 with detailed explanation]
- [Main point 2 with detailed explanation]
- [Main point 3 with detailed explanation]
- [Continue with all key points]

Main Idea:

- [Primary concept 1 with context]
- [Primary concept 2 with context]
- [Primary concept 3 with context]

Content to analyze:
{content}"""

    elif content_type == 'structured':
        return f"""You are an expert study assistant. Create a comprehensive study reviewer from the structured content below.

CRITICAL REQUIREMENTS:
- Follow the EXACT format specified below
- Include ALL sections in the correct order
- Focus on organizing and explaining the existing content
- Provide detailed explanations and context

You MUST format your response EXACTLY as follows with proper line breaks:

Summary:

[Write a comprehensive summary of the main topics covered - 2-3 paragraphs]

Terminology:

- [Term 1]: [Clear definition and explanation]
- [Term 2]: [Clear definition and explanation]
- [Term 3]: [Clear definition and explanation]
- [Continue with all important terms from the content]

Key Points:

- [Main point 1 with detailed explanation]
- [Main point 2 with detailed explanation]
- [Main point 3 with detailed explanation]
- [Continue with all key points]

Main Idea:

- [Primary concept 1 with context]
- [Primary concept 2 with context]
- [Primary concept 3 with context]

Content to analyze:
{content}"""

    elif content_type == 'educational':
        return f"""You are an expert study assistant. Create a comprehensive study reviewer from the educational content below.

CRITICAL REQUIREMENTS:
- Follow the EXACT format specified below
- Include ALL sections in the correct order
- Focus on organizing and explaining the existing content
- Provide detailed explanations and context

You MUST format your response EXACTLY as follows with proper line breaks:

Summary:

[Write a comprehensive summary of the main topics covered - 2-3 paragraphs]

Terminology:

- [Term 1]: [Clear definition and explanation]
- [Term 2]: [Clear definition and explanation]
- [Term 3]: [Clear definition and explanation]
- [Continue with all important terms from the content]

Key Points:

- [Main point 1 with detailed explanation]
- [Main point 2 with detailed explanation]
- [Main point 3 with detailed explanation]
- [Continue with all key points]

Main Idea:

- [Primary concept 1 with context]
- [Primary concept 2 with context]
- [Primary concept 3 with context]

Content to analyze:
{content}"""

    elif content_type == 'meeting':
        return f"""You are an expert meeting assistant. The following content appears to be meeting notes. Create a comprehensive reviewer that:

1. **Summarizes key decisions** and outcomes
2. **Identifies action items** and responsibilities
3. **Highlights important discussions** and insights
4. **Creates follow-up reminders** and next steps

Format your response as:

**Meeting Summary:**
[Brief overview of the meeting purpose and outcomes]

**Key Decisions:**
- [Important decisions made during the meeting]

**Action Items:**
- [Tasks and responsibilities assigned]

**Important Discussions:**
- [Key points from discussions]

**Next Steps:**
- [Follow-up actions and future meetings]

Content:
{content}"""

    else:  # general content
        return f"""You are an expert study assistant. Create a comprehensive study reviewer from the content below.

CRITICAL REQUIREMENTS:
- Follow the EXACT format specified below
- Include ALL sections in the correct order
- Do NOT generate new questions
- Focus on organizing and explaining the existing content
- Provide detailed explanations and context

You MUST format your response EXACTLY as follows with proper line breaks:

Summary:

[Write a comprehensive summary of the main topics covered - 2-3 paragraphs]

Terminology:

- [Term 1]: [Clear definition and explanation]
- [Term 2]: [Clear definition and explanation]
- [Term 3]: [Clear definition and explanation]
- [Continue with all important terms from the content]

Key Points:

- [Main point 1 with detailed explanation]
- [Main point 2 with detailed explanation]
- [Main point 3 with detailed explanation]
- [Continue with all key points]

Main Idea:

- [Primary concept 1 with context]
- [Primary concept 2 with context]
- [Primary concept 3 with context]

Content to analyze:
{content}"""

def clean_ai_response(response_text):
    """Minimal cleaning - only remove thinking tags and fix formatting"""
    import re
    
    if not response_text:
        return ""
    
    # Remove <think>...</think> blocks (including incomplete ones)
    cleaned = re.sub(r'<think>.*?(</think>|$)', '', response_text, flags=re.DOTALL)
    
    # If after removing thinking tags, we have very little content, try to extract from thinking
    if len(cleaned.strip()) < 20:
        # Try to extract the actual response from thinking tags
        think_match = re.search(r'<think>.*?(?:So,|Therefore,|In summary,|The answer is|The result is|Summary:)(.*?)(?:</think>|$)', response_text, flags=re.DOTALL | re.IGNORECASE)
        if think_match:
            extracted = think_match.group(1).strip()
            if len(extracted) > 10:
                cleaned = extracted
    
    # Remove markdown bold formatting that's not wanted
    cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)  # Remove **bold** but keep content
    
    # Convert LaTeX math expressions to plain text
    cleaned = re.sub(r'\\boxed\{([^}]*)\}', r'\1', cleaned)  # \boxed{14} -> 14 (handle incomplete)
    cleaned = re.sub(r'\\\[(.*?)\\\]', r'\1', cleaned)       # \[...\] -> content
    cleaned = re.sub(r'\\\((.*?)\\\)', r'\1', cleaned)       # \(...\) -> content
    cleaned = re.sub(r'\\\$([^$]*)\\\$', r'\1', cleaned)     # $...$ -> content (handle incomplete)
    
    # Clean up excessive whitespace
    cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)  # Max 2 newlines
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)           # Collapse spaces/tabs
    cleaned = cleaned.strip()
    
    return cleaned

def validate_quiz_content(content):
    """
    Validate that the content is actually quiz questions and not CSS/JSON configuration.
    """
    import re
    
    if not content:
        return False, "Empty content"
    
    # Check for CSS/JSON configuration patterns
    css_patterns = [
        r'ring-offset-width',
        r'border-spacing',
        r'translate-[xy]',
        r'rotation',
        r'skew-[xy]',
        r'scale-[xy]',
        r'gradient-',
        r'backdrop-',
        r'contain-',
        r'shadow-colored',
        r'blur',
        r'brightness',
        r'contrast',
        r'grayscale',
        r'hue-rotate',
        r'invert',
        r'saturate',
        r'drop-shadow'
    ]
    
    for pattern in css_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            return False, f"Content contains CSS configuration data: {pattern}"
    
    # Check for JSON-like structure
    if re.search(r'\{[^}]*"[^"]*":[^}]*\}', content):
        return False, "Content appears to be JSON configuration data"
    
    # Check for quiz question patterns
    quiz_patterns = [
        r'Q\d+\.',
        r'Question \d+:',
        r'Correct Answer:',
        r'[A-D]\)'
    ]
    
    quiz_score = 0
    for pattern in quiz_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            quiz_score += 1
    
    if quiz_score < 2:
        return False, "Content does not appear to contain quiz questions"
    
    return True, "Valid quiz content"

class AIAutomaticReviewerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            text = request.data.get('text', '')
            title = request.data.get('title', 'AI Generated Reviewer')
            source_note = request.data.get('source_note')
            source_notebook = request.data.get('source_notebook')
            tags = request.data.get('tags', [])
            note_type = request.data.get('note_type')  # Get note type for better context
            question_count = request.data.get('question_count', 10)  # Get question count for quiz generation

            logger.info(f"AIAutomaticReviewerView POST: text length={len(text)}, title={title}, note_type={note_type}")

            if not text or not text.strip():
                logger.warning("AIAutomaticReviewerView: No text provided.")
                return Response({'error': 'No text provided.'}, status=400)

            # Analyze content type and get adaptive prompt
            content_type, confidence_score = analyze_content_type(text)
            logger.info(f"Content analysis: type={content_type}, confidence={confidence_score}")
            
            # Use adaptive prompt for reviewer generation, fallback to database config for quiz
            if title.lower().startswith('quiz:'):
                try:
                    prompt = get_ai_config('quiz_prompt', content=text, question_count=question_count)
                except ValueError as e:
                    logger.error(f"Failed to get AI configuration: {e}")
                    return Response(
                        {'error': 'AI configuration not found. Please contact administrator.'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                # Use adaptive prompt based on content analysis
                prompt = get_adaptive_prompt(content_type, text, note_type)
                logger.info(f"Using adaptive prompt for content type: {content_type}")

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 3000,  # Increased to 3000 to allow even longer responses
                    "repeat_penalty": 1.1
                }
            }

            try:
                response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
            except requests.exceptions.ConnectionError:
                logger.error("Could not connect to Ollama. Make sure Ollama is running.")
                return Response(
                    {"error": "Could not connect to Ollama. Please make sure Ollama is running on your computer."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            except requests.exceptions.Timeout:
                logger.error("Ollama request timed out. The model is taking too long to respond.")
                return Response(
                    {"error": "The AI is taking too long to respond. Please try again with a shorter text or wait a moment."},
                    status=status.HTTP_408_REQUEST_TIMEOUT
                )

            if response.status_code == 200:
                result = response.json()
                raw_reviewer_content = result.get('response', '').strip()
                
                logger.info(f"Raw AI response length: {len(raw_reviewer_content)}")
                logger.info(f"Raw AI response preview: {raw_reviewer_content[:200]}...")
                
                # Clean the response to remove thinking tags
                reviewer_content = clean_ai_response(raw_reviewer_content)
                
                logger.info(f"Cleaned reviewer content length: {len(reviewer_content)}")
                logger.info(f"Cleaned reviewer content preview: {reviewer_content[:200]}...")

                if not reviewer_content:
                    logger.warning("Ollama returned empty reviewer content.")
                    return Response(
                        {"error": "Failed to generate reviewer content. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                # For quiz generation, validate that we got actual quiz questions
                if title.lower().startswith('quiz:'):
                    is_valid, validation_message = validate_quiz_content(reviewer_content)
                    if not is_valid:
                        logger.error(f"Quiz content validation failed: {validation_message}")
                        logger.error(f"Raw content that failed validation: {reviewer_content[:500]}...")
                        return Response(
                            {"error": f"AI generated invalid content: {validation_message}. Please try again with different content."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    logger.info("Quiz content validation passed")

                # Save the reviewer
                reviewer_data = {
                    'title': title,
                    'content': reviewer_content,
                    'tags': tags,
                }
                if source_note:
                    reviewer_data['source_note'] = source_note
                if source_notebook:
                    reviewer_data['source_notebook'] = source_notebook

                serializer = ReviewerSerializer(data=reviewer_data, context={'request': request})
                if serializer.is_valid():
                    reviewer = serializer.save()
                    return Response(serializer.data, status=201)
                else:
                    logger.error(f"ReviewerSerializer error: {serializer.errors}")
                    return Response({'error': serializer.errors}, status=400)
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {"error": f"Failed to generate reviewer content. Ollama error: {response.text}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            logger.error(f"Error in AI automatic reviewer: {str(e)}")
            return Response(
                {"error": f"Failed to generate reviewer content. Internal error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deleted_reviewers(request):
    reviewers = Reviewer.objects.filter(user=request.user, is_deleted=True)
    print(f"[DEBUG] Trash API - User: {request.user}, Deleted Reviewers: {list(reviewers.values('id', 'title', 'is_deleted', 'deleted_at'))}")
    serializer = ReviewerSerializer(reviewers, many=True)
    return Response(serializer.data) 