from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
import logging
import requests
import os
import re
from reviewer.serializers import ReviewerSerializer
from core.utils import get_ai_config
from django.utils.timezone import now

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ollama API configuration
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:1.5b")
# Allow multiple candidate URLs to avoid localhost/host resolution issues
OLLAMA_URLS = [
    os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate"),
    "http://127.0.0.1:11434/api/generate",
    "http://host.docker.internal:11434/api/generate",
]

def ollama_generate(payload, timeout=300, stream=False):
    """Try multiple Ollama URLs until one succeeds."""
    last_exc = None
    for url in OLLAMA_URLS:
        try:
            resp = requests.post(url, json=payload, timeout=timeout, stream=stream)
            if resp.status_code == 200:
                return resp
            logger.warning(f"Ollama URL {url} returned {resp.status_code}")
        except Exception as e:
            last_exc = e
            logger.warning(f"Ollama URL {url} failed: {e}")
    if last_exc:
        raise last_exc
    raise requests.exceptions.ConnectionError("All Ollama endpoints failed")

def clean_ai_response(response_text):
    """Remove thinking patterns and show only final responses"""
    import re
    
    if not response_text:
        return ""
    
    # Remove <think>...</think> blocks completely
    cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL | re.IGNORECASE)
    
    # Clean up excessive whitespace
    cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)  # Max 2 newlines
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)             # Collapse spaces/tabs
    cleaned = cleaned.strip()
    
    return cleaned

def format_chat_prompt(messages):
    # Proper conversation format with clear role indicators
    conversation = []
    
    # Only keep last 4 messages to avoid confusion
    recent_messages = messages[-4:] if len(messages) > 4 else messages
    
    for msg in recent_messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '').strip()
        
        if content:  # Only include non-empty messages
            if role == 'user':
                conversation.append(f"Human: {content}")
            elif role == 'assistant':
                conversation.append(f"Assistant: {content}")
    
    return "\n\n".join(conversation)

def extract_final_answer(output):
    """
    Always return only the last non-empty line of the model output (the true AI user-facing answer),
    completely ignoring any prior lines or reasoning. This guarantees only the final chat reply is sent.
    """
    if not isinstance(output, str):
        return output
    lines = output.splitlines()
    # Last non-empty, trimmed line is always the answer
    for line in reversed(lines):
        if line.strip():
            return line.strip()
    return output.strip() if output else ''

@csrf_exempt
@require_http_methods(["POST"])
def chat(request):
    try:
        data = json.loads(request.body)
        messages = data.get('messages', [])
        note_context = data.get('note_context', '')
        if not messages:
            return JsonResponse({
                'error': 'No messages provided'
            }, status=400)
        
        # No filtering, send all messages as-is
        user_assistant_msgs = messages
        
        # Format prompt for DeepSeek/LLM: Only reply, no thoughts/justification/internal monologue
        system = (
            "You are an expert chatbot. Strictly follow these instructions:\n"
            "- Output only your final, complete message for the user.\n"
            "- Do NOT show your reasoning, plans, or internal thoughts—just the user's answer.\n"
            "- Respond as clearly and concisely as possible.\n"
            "- Never say 'I should', 'Let me think', or 'Here is what I might say'—just give your answer.\n"
        )
        prompt = system + "\n"
        for m in user_assistant_msgs:
            prefix = 'User:' if m['role'] == 'user' else 'AI:'
            prompt += f"{prefix} {m['content']}\n"
        prompt += 'AI:'
        
        # Call Ollama API with streaming - Default settings
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": True
        }
        
        response = ollama_generate(payload, timeout=120, stream=True)
        
        if response.status_code == 200:
            # Create a streaming response - Real-time typing animation
            def generate():
                full_response = ""
                accumulated_clean_content = ""
                
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if 'response' in data:
                                chunk = data['response']
                                full_response += chunk
                                
                                # Clean the accumulated response
                                current_clean_response = clean_ai_response(full_response)
                                
                                # Only send content if it's significantly different and meaningful
                                if len(current_clean_response) > len(accumulated_clean_content):
                                    new_content = current_clean_response[len(accumulated_clean_content):]
                                    # Only send if the new content is substantial and not just thinking
                                    import re
                                    if (new_content.strip() and 
                                        len(new_content.strip()) > 3 and 
                                        not re.match(r'^(Let me|I need to|First,|To answer)', new_content.strip(), re.IGNORECASE)):
                                        yield f"data: {json.dumps({'chunk': new_content, 'full_response': current_clean_response})}\n\n"
                                        accumulated_clean_content = current_clean_response
                                
                            if data.get('done', False):
                                break
                        except json.JSONDecodeError:
                            continue
                
                # Final cleanup and send completion signal
                final_cleaned_response = clean_ai_response(full_response)
                
                # Send any remaining clean content
                if len(final_cleaned_response) > len(accumulated_clean_content):
                    remaining_content = final_cleaned_response[len(accumulated_clean_content):]
                    if remaining_content.strip():
                        yield f"data: {json.dumps({'chunk': remaining_content, 'full_response': final_cleaned_response})}\n\n"
                
                yield f"data: {json.dumps({'done': True, 'full_response': final_cleaned_response})}\n\n"
            
            return StreamingHttpResponse(
                generate(),
                content_type='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Cache-Control'
                }
            )
        else:
            logger.error(f"Ollama API error: {response.status_code} - {response.text}")
            return JsonResponse({
                'error': 'Failed to get response from AI service. Make sure Ollama is running.'
            }, status=500)
    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to Ollama. Make sure Ollama is running.")
        return JsonResponse({
            'error': 'Could not connect to Ollama. Please make sure Ollama is running on your computer.'
        }, status=503)
    except requests.exceptions.Timeout:
        logger.error("Ollama request timed out. The model is taking too long to respond.")
        return JsonResponse({
            'error': 'The AI is taking too long to respond. Please try again with a shorter question or wait a moment.'
        }, status=408)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return JsonResponse({
            'error': str(e)
        }, status=500)

class SummarizeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def clean_html_content(self, html_text):
        """Remove HTML tags and extract clean text content"""
        from bs4 import BeautifulSoup
        
        if not html_text:
            return ""
        
        # Parse HTML
        soup = BeautifulSoup(html_text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text and clean up whitespace
        text = soup.get_text(separator=' ', strip=True)
        
        # Clean up excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    def post(self, request):
        try:
            text = request.data.get('text', '')
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Clean HTML content to extract only meaningful text
            clean_text = self.clean_html_content(text)
            
            if not clean_text or len(clean_text.strip()) < 10:
                return Response(
                    {"error": "Not enough content to summarize"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Summarizing content: {len(text)} chars (raw) -> {len(clean_text)} chars (clean)")
            
            # Get summarization prompt from database configuration
            try:
                summarize_prompt = get_ai_config('summary_prompt', content=clean_text)
            except ValueError as e:
                logger.warning(f"Failed to get summary configuration: {e}, using fallback")
                # Fallback to simple prompt if database config fails
                summarize_prompt = f"Summarize the following content in 2-3 clear paragraphs:\n\n{clean_text}"
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": summarize_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "top_k": 50,
                    "num_predict": 2500,  # Increased to 2500 for comprehensive summaries
                    "repeat_penalty": 1.15
                }
            }
            
            logger.info(f"Sending request to Ollama: model={OLLAMA_MODEL}, prompt_length={len(summarize_prompt)} chars")
            
            response = ollama_generate(payload, timeout=120, stream=False)
            
            logger.info(f"Ollama response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                raw_summary = result.get('response', '').strip()
                
                logger.info(f"Raw AI response length: {len(raw_summary)} chars")
                logger.debug(f"Raw AI response (first 500 chars): {raw_summary[:500]}")
                
                # Clean the response to remove thinking tags
                summary = clean_ai_response(raw_summary)
                
                logger.info(f"Cleaned summary length: {len(summary)} chars")
                logger.debug(f"Cleaned summary (first 200 chars): {summary[:200]}")
                
                # If cleaning removed everything, try using raw response
                if not summary or len(summary) < 20:
                    logger.warning(f"Summary too short after cleaning. Using raw response.")
                    summary = raw_summary
                
                # Final validation
                if not summary or len(summary) < 10:
                    logger.error(f"Summary still too short or empty: '{summary}'")
                    return Response(
                        {"error": "Failed to generate a meaningful summary. The AI returned an empty response."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                return Response({"summary": summary})
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Failed to generate summary. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
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
        except Exception as e:
            logger.error(f"Error in summarization: {str(e)}")
            return Response(
                {"error": "Failed to generate summary. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            text = request.data.get('text', '')
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get review prompt from database configuration
            try:
                review_prompt = get_ai_config('reviewer_prompt', content=text)
            except ValueError as e:
                logger.error(f"Failed to get review configuration: {e}")
                return Response(
                    {'error': 'AI configuration not found. Please contact administrator.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": review_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 200,
                    "repeat_penalty": 1.1
                }
            }
            
            response = ollama_generate(payload, timeout=120, stream=False)
            
            if response.status_code == 200:
                result = response.json()
                raw_review = result.get('response', '').strip()
                
                # Clean the response to remove thinking tags
                review = clean_ai_response(raw_review)
                
                if not review:
                    return Response(
                        {"error": "Failed to generate review. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                return Response({"review": review})
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Failed to generate review. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
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
        except Exception as e:
            logger.error(f"Error in review: {str(e)}")
            return Response(
                {"error": "Failed to generate review. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AIAutomaticReviewerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            text = request.data.get('text', '')
            title = request.data.get('title', 'AI Generated Reviewer')
            source_note = request.data.get('source_note')
            source_notebook = request.data.get('source_notebook')
            tags = request.data.get('tags', [])

            logger.info(f"AIAutomaticReviewerView POST: text length={len(text)}, title={title}")

            if not text or not text.strip():
                logger.warning("AIAutomaticReviewerView: No text provided.")
                return Response({'error': 'No text provided.'}, status=400)

            # Determine prompt type and get from database
            try:
                if title.lower().startswith('quiz:'):
                    prompt = get_ai_config('quiz_prompt', content=text)
                else:
                    prompt = get_ai_config('summary_prompt', content=text)
            except ValueError as e:
                logger.error(f"Failed to get AI configuration: {e}")
                return Response(
                    {'error': 'AI configuration not found. Please contact administrator.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": 1000
                }
            }

            try:
                response = ollama_generate(payload, timeout=300, stream=False)
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
                reviewer_content = result.get('response', '').strip()

                if not reviewer_content:
                    logger.warning("Ollama returned empty reviewer content.")
                    return Response(
                        {"error": "Failed to generate reviewer content. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

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

class ConvertToFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            text = request.data.get('text', '')
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a prompt for converting text to flashcards
            flashcard_prompt = f"""STOP! DO NOT CREATE QUESTIONS! CREATE DEFINITION-TERM FLASHCARDS!

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

Text to convert:
{text}

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

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": flashcard_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 800,
                    "repeat_penalty": 1.1
                }
            }
            
            response = ollama_generate(payload, timeout=120, stream=False)
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    response_text = result.get('response', '').strip()
                    
                    # Try to parse the JSON response
                    import json
                    import re
                    
                    # Extract JSON from the response (in case there's extra text)
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        flashcards_data = json.loads(json_match.group())
                    else:
                        # If no JSON found, try to parse the entire response
                        flashcards_data = json.loads(response_text)
                    
                    # Post-process to ensure Definition-Term format
                    processed_flashcards = []
                    for card in flashcards_data.get('flashcards', []):
                        front = card.get('front', '')
                        back = card.get('back', '')
                        
                        # ALWAYS convert to Definition-Term format regardless of input
                        # Extract term from either front or back
                        term = None
                        definition = None
                        
                        # Check if front is a question
                        if (front.startswith('Q:') or front.startswith('What') or front.startswith('Why') or 
                            front.startswith('How') or front.startswith('Define') or front.startswith('Explain') or
                            front.startswith('Can you') or '?' in front):
                            # Front is question, back is answer
                            question = front
                            answer = back
                            
                            # Extract term from answer
                            if answer.startswith('Abstraction'):
                                term = 'Abstraction'
                                definition = answer.replace('Abstraction', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Polymorphism'):
                                term = 'Polymorphism'
                                definition = answer.replace('Polymorphism', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Inheritance'):
                                term = 'Inheritance'
                                definition = answer.replace('Inheritance', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Encapsulation'):
                                term = 'Encapsulation'
                                definition = answer.replace('Encapsulation', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Object'):
                                term = 'Object'
                                definition = answer.replace('Object', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Class'):
                                term = 'Class'
                                definition = answer.replace('Class', '', 1).strip().lstrip('.,:;!?').strip()
                            else:
                                # Fallback: extract from question
                                question_clean = question.replace('Q:', '').replace('What is', '').replace('Why is', '').replace('How does', '').replace('How do you', '').replace('Define', '').replace('Explain', '').replace('?', '').strip()
                                term = question_clean
                                definition = answer
                        
                        # Check if back is a question
                        elif (back.startswith('Q:') or back.startswith('What') or back.startswith('Why') or 
                              back.startswith('How') or back.startswith('Define') or back.startswith('Explain') or
                              back.startswith('Can you') or '?' in back):
                            # Back is question, front is answer
                            question = back
                            answer = front
                            
                            # Extract term from answer
                            if answer.startswith('Abstraction'):
                                term = 'Abstraction'
                                definition = answer.replace('Abstraction', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Polymorphism'):
                                term = 'Polymorphism'
                                definition = answer.replace('Polymorphism', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Inheritance'):
                                term = 'Inheritance'
                                definition = answer.replace('Inheritance', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Encapsulation'):
                                term = 'Encapsulation'
                                definition = answer.replace('Encapsulation', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Object'):
                                term = 'Object'
                                definition = answer.replace('Object', '', 1).strip().lstrip('.,:;!?').strip()
                            elif answer.startswith('Class'):
                                term = 'Class'
                                definition = answer.replace('Class', '', 1).strip().lstrip('.,:;!?').strip()
                            else:
                                # Fallback: extract from question
                                question_clean = question.replace('Q:', '').replace('What is', '').replace('Why is', '').replace('How does', '').replace('How do you', '').replace('Define', '').replace('Explain', '').replace('?', '').strip()
                                term = question_clean
                                definition = answer
                        
                        # If no question format detected, assume it's already in correct format
                        else:
                            term = back
                            definition = front
                        
                        # Capitalize first letter of definition
                        if definition:
                            definition = definition[0].upper() + definition[1:] if definition else ""
                        
                        processed_flashcards.append({
                            'front': definition,  # The definition becomes the front
                            'back': term         # The term becomes the back
                        })
                    
                    return Response({'flashcards': processed_flashcards})
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse AI response as JSON: {e}")
                    logger.error(f"Raw response: {response_text}")
                    return Response(
                        {'error': 'Failed to parse AI response. Please try again.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {'error': 'Failed to get response from AI service. Make sure Ollama is running.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except requests.exceptions.ConnectionError:
            logger.error("Could not connect to Ollama. Make sure Ollama is running.")
            return Response(
                {'error': 'Could not connect to Ollama. Please make sure Ollama is running on your computer.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except requests.exceptions.Timeout:
            logger.error("Ollama request timed out.")
            return Response(
                {'error': 'The AI is taking too long to respond. Please try again.'},
                status=status.HTTP_408_REQUEST_TIMEOUT
            )
        except Exception as e:
            logger.error(f"Error in convert to flashcards endpoint: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class NotebookSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            notebook_id = request.data.get('notebook_id')
            if not notebook_id:
                return Response(
                    {"error": "No notebook ID provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user = request.user
            # Fetch notebook and notes
            from .models import Notebook, Note
            notebook = Notebook.objects.get(id=notebook_id, user=user)
            notes = Note.objects.filter(notebook=notebook)

            # Helper to clean HTML to plain text
            import re
            def clean_html(text: str) -> str:
                if not text:
                    return ""
                cleaned = re.sub(r'<[^>]+>', ' ', text)
                cleaned = cleaned.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                return cleaned

            # Combine all note content (trim long notes to avoid overlong prompts)
            parts = []
            for note in notes:
                title = (note.title or '').strip()
                content = clean_html(note.content or '')
                content = content[:4000]
                parts.append(f"Title: {title}\nContent: {content}")
            combined_content = "\n\n".join(parts)

            import logging
            logger = logging.getLogger('notes.ai_views')
            logger.info(f"[NB_SUMMARY] Combined content (len={len(combined_content)}):\n{combined_content[:800]}...")
            try:
                summary_prompt = get_ai_config('notebook_summary_prompt', content=combined_content)
            except ValueError:
                summary_prompt = (
                    "You are DeepSeek-R1 composing a clear, concise notebook summary.\n"
                    "Requirements:\n"
                    "- Output only the summary. No system thoughts, no preamble.\n"
                    "- Use short sections with headings.\n"
                    "- Preserve meaningful bullets/numbered lists.\n"
                    "- Remove filler and repetitions; do NOT say generic lines like 'This notebook contains X notes'.\n"
                    "- Highlight key topics, important definitions, and any step-by-step lists if present.\n\n"
                    f"Notebook Content (cleaned):\n{combined_content}"
                )
            payload = {
                "model": OLLAMA_MODEL,  # deepseek-r1:1.5b (configured above)
                "prompt": summary_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                    "top_k": 50,
                    "num_predict": 1800,
                    "repeat_penalty": 1.15
                }
            }
            logger.info(f"[NB_SUMMARY] Payload sent to Ollama: {payload | {'prompt': summary_prompt[:200] + '...'}}")
            try:
                response = ollama_generate(payload, timeout=300, stream=False)
                logger.info(f"[NB_SUMMARY] Ollama response status: {response.status_code}")
                result = response.json()
                raw = result.get('response', '').strip()
                logger.info(f"[NB_SUMMARY] Raw AI response length: {len(raw)} chars\nPreview: {raw[:800]}...")
                summary = clean_ai_response(raw)
                logger.info(f"[NB_SUMMARY] Cleaned summary length: {len(summary)} chars\nPreview: {summary[:800]}...")
                if not summary:
                    logger.warning("[NB_SUMMARY] No summary generated from AI, returning fallback message.")
                    return Response(
                        {"error": "Failed to generate notebook summary. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                logger.info("[NB_SUMMARY] Returning summary to frontend successfully.")
                return Response({"summary": summary, "generated_at": now()})
            except Exception as e:
                logger.error(f"[NB_SUMMARY] Ollama error: {e}")
                return Response(
                    {"error": "Could not connect to Ollama. Please make sure Ollama is running on your computer."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        except Exception as e:
            import traceback
            logger = logging.getLogger('notes.ai_views')
            logger.error(f"[NB_SUMMARY] Backend error: {e}\n{traceback.format_exc()}")
            return Response({"error": f"Backend error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UrgencyDetectionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            text = request.data.get('text', '')
            title = request.data.get('title', '')
            note_type = request.data.get('note_type', 'other')
            
            if not text and not title:
                return Response(
                    {"error": "No text or title provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get urgency detection prompt from database configuration
            try:
                urgency_prompt = get_ai_config('urgency_detection_prompt', content=text)
            except ValueError:
                # Fallback prompt if configuration not found
                urgency_prompt = f"""Analyze the following note content and determine its urgency level. Consider:

1. Time-sensitive language (deadlines, due dates, exam dates, ASAP, urgent)
2. Academic context (assignments, exams, presentations)
3. Work context (meetings, project deadlines, client requests)
4. Personal context (appointments, bills, important events)
5. Content patterns that suggest immediate attention is needed

Note Title: {title}
Note Type: {note_type}
Content: {text}

Please respond with ONLY a JSON object in this exact format:
{{
    "urgency_level": "low|medium|high|urgent",
    "confidence": 0.85,
    "reasoning": "Brief explanation of why this level was chosen",
    "suggested_priority": "low|medium|high|urgent",
    "time_sensitive": true|false,
    "deadlines_mentioned": ["list", "of", "deadlines"],
    "action_required": true|false
}}"""
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": urgency_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.9,
                    "top_k": 40,
                    "num_predict": 300,
                    "repeat_penalty": 1.1
                }
            }
            
            response = ollama_generate(payload, timeout=60, stream=False)
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                try:
                    # Try to parse JSON response
                    import json
                    urgency_data = json.loads(ai_response)
                    
                    return Response(urgency_data)
                except json.JSONDecodeError:
                    # If JSON parsing fails, return a structured response
                    logger.warning("AI response was not valid JSON, returning structured fallback")
                    return Response({
                        "urgency_level": "medium",
                        "confidence": 0.5,
                        "reasoning": "AI analysis completed but response format was unexpected",
                        "suggested_priority": "medium",
                        "time_sensitive": False,
                        "deadlines_mentioned": [],
                        "action_required": False,
                        "raw_ai_response": ai_response
                    })
                
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Failed to analyze urgency. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except requests.exceptions.ConnectionError:
            logger.error("Could not connect to Ollama. Make sure Ollama is running.")
            return Response(
                {"error": "Could not connect to Ollama. Please make sure Ollama is running on your computer."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error in urgency detection: {str(e)}")
            return Response(
                {"error": "Failed to analyze urgency. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SmartChunkingView(APIView):
    permission_classes = [IsAuthenticated]

    def clean_html_content(self, text):
        """Remove HTML tags and clean content for better processing."""
        import re
        # Remove HTML tags
        cleaned = re.sub(r'<[^>]+>', '', text)
        # Clean up extra whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        # Remove common HTML entities
        cleaned = cleaned.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        return cleaned.strip()

    def analyze_content_complexity(self, text):
        """Analyze content complexity to determine optimal chunking strategy."""
        # Clean HTML first
        clean_text = self.clean_html_content(text)
        word_count = len(clean_text.split())
        sentence_count = len([s for s in clean_text.split('.') if s.strip()])
        
        # Simple complexity indicators
        has_headings = bool(re.search(r'^#{1,6}\s+', clean_text, re.MULTILINE))
        has_lists = bool(re.search(r'^\s*[-*+]\s+', clean_text, re.MULTILINE))
        has_code = bool(re.search(r'```|`[^`]+`', clean_text))
        
        complexity_score = 0
        if word_count > 1000:
            complexity_score += 3
        elif word_count > 500:
            complexity_score += 2
        elif word_count > 200:
            complexity_score += 1
            
        if has_headings:
            complexity_score += 1
        if has_lists:
            complexity_score += 1
        if has_code:
            complexity_score += 2
            
        if complexity_score >= 5:
            return "high"
        elif complexity_score >= 3:
            return "medium"
        else:
            return "low"

    def get_adaptive_chunking_strategy(self, text, topic):
        """Determine the best chunking strategy based on content analysis."""
        # Clean HTML content first
        clean_text = self.clean_html_content(text)
        complexity = self.analyze_content_complexity(clean_text)
        word_count = len(clean_text.split())
        
        # Determine optimal number of chunks
        if complexity == "high":
            target_chunks = min(8, max(4, word_count // 200))
        elif complexity == "medium":
            target_chunks = min(6, max(3, word_count // 300))
        else:
            target_chunks = min(4, max(2, word_count // 400))
            
        return {
            "target_chunks": target_chunks,
            "complexity": complexity,
            "strategy": "hierarchical" if complexity == "high" else "sequential"
        }

    def post(self, request):
        try:
            text = request.data.get('text', '')
            topic = request.data.get('topic', '')
            
            if not text or not text.strip():
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Clean HTML content first
            clean_text = self.clean_html_content(text)
            
            # Analyze content and get adaptive strategy
            content_analysis = self.get_adaptive_chunking_strategy(clean_text, topic)
            
            # Get smart chunking prompt from database configuration
            try:
                chunking_prompt = get_ai_config('smart_chunking_prompt', content=clean_text, topic=topic)
                logger.info("Using database smart chunking prompt")
            except ValueError as e:
                logger.warning(f"Database prompt not found, using fallback: {e}")
                # Enhanced fallback prompt with adaptive strategy
                chunking_prompt = f"""You are an expert learning strategist. Analyze the following content and suggest optimal note chunking.

Content Analysis:
- Complexity: {content_analysis['complexity']}
- Target chunks: {content_analysis['target_chunks']}
- Strategy: {content_analysis['strategy']}

Topic: {topic}
Content: {clean_text}

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
    "total_notes_suggested": {content_analysis['target_chunks']},
    "reasoning": "Detailed explanation of why this chunking approach was chosen, including learning theory principles",
    "study_recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2"
    ],
    "chunking_strategy": "{content_analysis['strategy']}",
    "estimated_study_time": "X hours total",
    "content_complexity": "{content_analysis['complexity']}"
}}"""
            
            # Adjust AI parameters based on content complexity
            if content_analysis['complexity'] == 'high':
                temperature = 0.2
                num_predict = 800
            elif content_analysis['complexity'] == 'medium':
                temperature = 0.3
                num_predict = 600
            else:
                temperature = 0.4
                num_predict = 400
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": chunking_prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.8,
                    "top_k": 40,
                    "num_predict": num_predict,
                    "repeat_penalty": 1.1
                }
            }
            
            logger.info(f"Sending request to Ollama with {len(clean_text)} characters of content")
            response = ollama_generate(payload, timeout=120, stream=False)
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                logger.info(f"Received AI response of {len(ai_response)} characters")
                
                try:
                    # Try to parse JSON response
                    import json
                    
                    # Clean the AI response first
                    cleaned_response = ai_response.strip()
                    
                    # Try to extract JSON from the response if it's wrapped in other text
                    if '```json' in cleaned_response:
                        start = cleaned_response.find('```json') + 7
                        end = cleaned_response.find('```', start)
                        if end != -1:
                            cleaned_response = cleaned_response[start:end].strip()
                    elif '```' in cleaned_response:
                        start = cleaned_response.find('```') + 3
                        end = cleaned_response.find('```', start)
                        if end != -1:
                            cleaned_response = cleaned_response[start:end].strip()
                    
                    # Try to find JSON object boundaries
                    if cleaned_response.startswith('{') and cleaned_response.endswith('}'):
                        pass  # Already looks like JSON
                    else:
                        # Try to extract JSON object
                        start = cleaned_response.find('{')
                        end = cleaned_response.rfind('}') + 1
                        if start != -1 and end > start:
                            cleaned_response = cleaned_response[start:end]
                    
                    chunking_data = json.loads(cleaned_response)
                    
                    # Validate and enhance the response
                    if 'suggested_chunks' not in chunking_data:
                        raise ValueError("Invalid response structure")
                    
                    # Add metadata
                    chunking_data['content_analysis'] = content_analysis
                    chunking_data['processing_timestamp'] = timezone.now().isoformat()
                    
                    return Response(chunking_data)
                    
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"AI response parsing failed: {str(e)}")
                    logger.warning(f"Raw AI response: {ai_response[:200]}...")
                    
                    # Enhanced fallback with content analysis
                    fallback_chunks = []
                    word_count = len(clean_text.split())
                    chunk_size = max(100, word_count // content_analysis['target_chunks'])
                    
                    # Try to extract better titles from the content
                    sentences = [s.strip() for s in clean_text.split('.') if s.strip()]
                    
                    for i in range(content_analysis['target_chunks']):
                        start_idx = i * chunk_size
                        end_idx = min((i + 1) * chunk_size, word_count)
                        words = clean_text.split()[start_idx:end_idx]
                        chunk_text = ' '.join(words)
                        
                        # Try to create a better title from the first sentence
                        first_sentence = sentences[i] if i < len(sentences) else chunk_text.split('.')[0]
                        title = first_sentence[:50] + "..." if len(first_sentence) > 50 else first_sentence
                        
                        # Determine difficulty based on content complexity
                        difficulty = "beginner" if len(chunk_text.split()) < 50 else "intermediate" if len(chunk_text.split()) < 150 else "advanced"
                        
                        fallback_chunks.append({
                            "title": title,
                            "content_preview": chunk_text[:100] + "..." if len(chunk_text) > 100 else chunk_text,
                            "key_concepts": ["content", "analysis"],
                            "estimated_length": "short" if len(chunk_text.split()) < 100 else "long" if len(chunk_text.split()) > 300 else "medium",
                            "priority": "low" if i == 0 else "high" if i == content_analysis['target_chunks'] - 1 else "medium",
                            "prerequisites": [],
                            "learning_objectives": ["Understand key concepts"],
                            "difficulty_level": difficulty
                        })
                    
                    return Response({
                        "suggested_chunks": fallback_chunks,
                        "total_notes_suggested": content_analysis['target_chunks'],
                        "reasoning": f"AI analysis completed but response format was unexpected. Content automatically divided into {content_analysis['target_chunks']} sections based on complexity analysis.",
                        "study_recommendations": [
                            "Review each section carefully",
                            "Create connections between related concepts",
                            "Practice active recall for each chunk"
                        ],
                        "chunking_strategy": content_analysis['strategy'],
                        "estimated_study_time": f"{content_analysis['target_chunks'] * 0.5} hours total",
                        "content_complexity": content_analysis['complexity'],
                        "content_analysis": content_analysis,
                        "processing_timestamp": timezone.now().isoformat(),
                        "raw_ai_response": ai_response
                    })
                
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Failed to analyze content chunking. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except requests.exceptions.ConnectionError:
            logger.error("Could not connect to Ollama. Make sure Ollama is running.")
            return Response(
                {"error": "Could not connect to Ollama. Please make sure Ollama is running on your computer."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error in smart chunking: {str(e)}")
            return Response(
                {"error": "Failed to analyze content chunking. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
