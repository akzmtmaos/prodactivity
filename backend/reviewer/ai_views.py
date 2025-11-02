from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
import requests
import logging
import os
import tempfile
from .serializers import ReviewerSerializer
from rest_framework.decorators import api_view, permission_classes
from .models import Reviewer
from core.utils import get_ai_config
from .file_extractors import extract_text_from_file

logger = logging.getLogger(__name__)

OLLAMA_API_URL = 'http://localhost:11434/api/generate'
OLLAMA_MODEL = 'gpt-oss:20b-cloud'

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

def get_default_quiz_prompt(content: str, question_count: int = 10) -> str:
    """Fallback quiz prompt when DB config is missing."""
    return f"""Generate EXACTLY {question_count} UNIQUE multiple-choice questions in this strict format:

Q1. [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [A/B/C/D]

CRITICAL REQUIREMENTS:
1. Each question MUST be completely UNIQUE - NO repetition
2. Each question MUST test a DIFFERENT concept from the content
3. Questions must be clear, specific, and directly answerable from the content
4. All 4 options (A/B/C/D) must be plausible but only ONE is correct
5. Do NOT add section headers, titles, or extra formatting
6. Do NOT add blank lines between question number and options
7. Stop after exactly Q{question_count}

Base ALL questions on the content below:

{content}
"""

def get_default_quiz_repair_prompt(content: str, question_count: int = 10) -> str:
    """Fallback repair prompt to coerce free-form text into strict quiz format."""
    return f"""Convert the content below into EXACTLY {question_count} UNIQUE multiple-choice questions using this strict format:

Q1. [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [A/B/C/D]

CRITICAL RULES:
1. Each question MUST be UNIQUE - remove any duplicates
2. Each question must test a DIFFERENT concept
3. Output ONLY the questions block - no extra text, headers, or formatting
4. Ensure exactly ONE correct answer per question
5. Do NOT add blank lines between question number and options
6. Stop after exactly Q{question_count}

Source content to repair:
{content}
"""

def get_adaptive_prompt(content_type, content, note_type=None):
    """Get adaptive prompt based on content analysis"""
    
    if content_type == 'qa':
        return f"""You are an expert study assistant. Create a comprehensive and detailed study reviewer from the content below.

FORMAT REQUIREMENTS:
Use EXACTLY these 4 sections with proper bullet formatting:

Summary:
Write a detailed 3-5 sentence summary that captures:
- The main topic and its context
- Why this topic is important
- What will be covered

Key Terms:
List ALL important terms, concepts, and definitions from the content.
Format each as: - Term: Clear, detailed explanation
Include at least 5-10 key terms with full definitions.

Key Points:
List ALL major concepts, ideas, and takeaways from the content.
Format each as: - Complete explanation of the point
Include at least 5-10 detailed points that cover the entire content.

Main Idea:
Write 2-4 sentences explaining:
- The central concept or theme
- Why it matters
- How it all connects together

CRITICAL RULES:
- Include ONLY these 4 sections (NO "Content Analysis", "Conclusion", or other sections)
- Add bullet points (-) to ALL items in Key Terms and Key Points
- Be thorough and comprehensive - extract ALL important information
- Do NOT skip details or summarize too much
- Stop immediately after the Main Idea section

Content to analyze:
{content}"""

    elif content_type == 'structured':
        return f"""You are an expert study assistant. Create a comprehensive and detailed study reviewer from the content below.

FORMAT REQUIREMENTS:
Use EXACTLY these 4 sections with proper bullet formatting:

Summary:
Write a detailed 3-5 sentence summary that captures:
- The main topic and its context
- Why this topic is important
- What will be covered

Key Terms:
List ALL important terms, concepts, and definitions from the content.
Format each as: - Term: Clear, detailed explanation
Include at least 5-10 key terms with full definitions.

Key Points:
List ALL major concepts, ideas, and takeaways from the content.
Format each as: - Complete explanation of the point
Include at least 5-10 detailed points that cover the entire content.

Main Idea:
Write 2-4 sentences explaining:
- The central concept or theme
- Why it matters
- How it all connects together

CRITICAL RULES:
- Include ONLY these 4 sections (NO "Content Analysis", "Conclusion", or other sections)
- Add bullet points (-) to ALL items in Key Terms and Key Points
- Be thorough and comprehensive - extract ALL important information
- Do NOT skip details or summarize too much
- Stop immediately after the Main Idea section

Content to analyze:
{content}"""

    elif content_type == 'educational':
        return f"""You are an expert study assistant. Create a comprehensive and detailed study reviewer from the content below.

FORMAT REQUIREMENTS:
Use EXACTLY these 4 sections with proper bullet formatting:

Summary:
Write a detailed 3-5 sentence summary that captures:
- The main topic and its context
- Why this topic is important
- What will be covered

Key Terms:
List ALL important terms, concepts, and definitions from the content.
Format each as: - Term: Clear, detailed explanation
Include at least 5-10 key terms with full definitions.

Key Points:
List ALL major concepts, ideas, and takeaways from the content.
Format each as: - Complete explanation of the point
Include at least 5-10 detailed points that cover the entire content.

Main Idea:
Write 2-4 sentences explaining:
- The central concept or theme
- Why it matters
- How it all connects together

CRITICAL RULES:
- Include ONLY these 4 sections (NO "Content Analysis", "Conclusion", or other sections)
- Add bullet points (-) to ALL items in Key Terms and Key Points
- Be thorough and comprehensive - extract ALL important information
- Do NOT skip details or summarize too much
- Stop immediately after the Main Idea section

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
        return f"""You are an expert study assistant. Create a comprehensive and detailed study reviewer from the content below.

FORMAT REQUIREMENTS:
Use EXACTLY these 4 sections with proper bullet formatting:

Summary:
Write a detailed 3-5 sentence summary that captures:
- The main topic and its context
- Why this topic is important
- What will be covered

Key Terms:
List ALL important terms, concepts, and definitions from the content.
Format each as: - Term: Clear, detailed explanation
Include at least 5-10 key terms with full definitions.

Key Points:
List ALL major concepts, ideas, and takeaways from the content.
Format each as: - Complete explanation of the point
Include at least 5-10 detailed points that cover the entire content.

Main Idea:
Write 2-4 sentences explaining:
- The central concept or theme
- Why it matters
- How it all connects together

CRITICAL RULES:
- Include ONLY these 4 sections (NO "Content Analysis", "Conclusion", or other sections)
- Add bullet points (-) to ALL items in Key Terms and Key Points
- Be thorough and comprehensive - extract ALL important information
- Do NOT skip details or summarize too much
- Stop immediately after the Main Idea section

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
                    logger.error(f"Failed to get AI configuration: {e}. Falling back to default quiz prompt.")
                    # Fallback to built-in default prompt
                    prompt = get_default_quiz_prompt(text, question_count)
            else:
                # Use adaptive prompt based on content analysis
                prompt = get_adaptive_prompt(content_type, text, note_type)
                logger.info(f"Using adaptive prompt for content type: {content_type}")

            # Use stricter settings for quiz generation to reduce repetition
            if title.lower().startswith('quiz:'):
                payload = {
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.5,  # Higher temp for more diversity
                        "top_p": 0.8,
                        "top_k": 50,
                        "num_predict": 3000,
                        "repeat_penalty": 1.5  # Much higher to reduce repetition
                    }
                }
            else:
                payload = {
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.7,
                        "top_k": 40,
                        "num_predict": 3000,
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

                        # Attempt a strict reformatting pass to coerce quiz structure using Admin-managed config
                        try:
                            repair_prompt = get_ai_config('quiz_repair_prompt', question_count=question_count, content=reviewer_content)
                        except ValueError as e:
                            logger.error(f"Failed to get quiz_repair_prompt configuration: {e}. Using default repair prompt.")
                            # Fallback to built-in repair prompt
                            repair_prompt = get_default_quiz_repair_prompt(reviewer_content, question_count)

                        repair_payload = {
                            "model": OLLAMA_MODEL,
                            "prompt": repair_prompt,
                            "stream": False,
                            "options": {
                                "temperature": 0.5,
                                "top_p": 0.8,
                                "top_k": 50,
                                "num_predict": 3000,
                                "repeat_penalty": 1.5  # Higher to reduce repetition
                            }
                        }

                        try:
                            repair_response = requests.post(OLLAMA_API_URL, json=repair_payload, timeout=300)
                            if repair_response.status_code == 200:
                                repair_result = repair_response.json()
                                repaired_raw = repair_result.get('response', '').strip()
                                repaired = clean_ai_response(repaired_raw)
                                is_valid, validation_message = validate_quiz_content(repaired)
                                if is_valid:
                                    reviewer_content = repaired
                                    logger.info("Quiz content validation passed after repair")
                                else:
                                    logger.error(f"Quiz content still invalid after repair: {validation_message}")
                                    return Response(
                                        {"error": f"AI generated invalid content: {validation_message}. Please try again with different content."},
                                        status=status.HTTP_400_BAD_REQUEST
                                    )
                            else:
                                logger.error(f"Ollama repair API error: {repair_response.status_code} - {repair_response.text}")
                                return Response(
                                    {"error": "Failed to generate valid quiz content. Please try again."},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        except Exception as e:
                            logger.error(f"Repair attempt failed: {e}")
                            return Response(
                                {"error": "Failed to generate valid quiz content. Please try again."},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    else:
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


class FileUploadExtractView(APIView):
    """
    Upload a file (PDF, DOCX, TXT) and extract its text content for reviewer generation.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            uploaded_file = request.FILES.get('file')
            
            if not uploaded_file:
                return Response(
                    {'error': 'No file uploaded. Please select a file.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get file extension
            file_name = uploaded_file.name
            file_extension = os.path.splitext(file_name)[1].lower()
            
            # Validate file size (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            if uploaded_file.size > max_size:
                return Response(
                    {'error': 'File size too large. Maximum file size is 10MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file type
            allowed_extensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown', '.rst']
            if file_extension not in allowed_extensions:
                return Response(
                    {'error': f'Unsupported file format: {file_extension}. Supported formats: PDF, DOCX, TXT, MD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
                for chunk in uploaded_file.chunks():
                    tmp_file.write(chunk)
                tmp_file_path = tmp_file.name
            
            try:
                # Extract text from file
                extracted_text, error_message = extract_text_from_file(tmp_file_path, file_extension)
                
                if error_message:
                    return Response(
                        {'error': error_message},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if not extracted_text or len(extracted_text.strip()) < 50:
                    return Response(
                        {'error': 'Extracted text is too short or empty. Please upload a file with more content.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Return extracted text to frontend
                return Response({
                    'file_name': file_name,
                    'text': extracted_text,
                    'word_count': len(extracted_text.split()),
                    'char_count': len(extracted_text)
                }, status=status.HTTP_200_OK)
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(tmp_file_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {tmp_file_path}: {e}")
            
        except Exception as e:
            logger.error(f"Error in file upload extraction: {str(e)}")
            return Response(
                {'error': f'Failed to process file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 