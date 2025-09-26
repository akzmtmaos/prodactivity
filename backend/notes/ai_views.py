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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ollama API configuration
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "deepseek-r1:1.5b"

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
        
        formatted_prompt = format_chat_prompt(user_assistant_msgs)
        
        # Call Ollama API with streaming - Raw settings like ollama run
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": formatted_prompt,
            "stream": True
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120, stream=True)
        
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
                                
                                # Find new clean content to send
                                if len(current_clean_response) > len(accumulated_clean_content):
                                    new_content = current_clean_response[len(accumulated_clean_content):]
                                    if new_content.strip():  # Only send non-empty content
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

    def post(self, request):
        try:
            text = request.data.get('text', '')
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get summarization prompt from database configuration
            try:
                summarize_prompt = get_ai_config('summary_prompt', content=text)
            except ValueError as e:
                logger.error(f"Failed to get summary configuration: {e}")
                return Response(
                    {'error': 'AI configuration not found. Please contact administrator.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": summarize_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 1000,  # Increased from 500 to 1000
                    "repeat_penalty": 1.1
                }
            }
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                raw_summary = result.get('response', '').strip()
                
                # Clean the response to remove thinking tags
                summary = clean_ai_response(raw_summary)
                
                if not summary:
                    return Response(
                        {"error": "Failed to generate summary. Please try again."},
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
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            
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
            flashcard_prompt = f"""Convert the following text into flashcards. Create 5-10 flashcards that cover the key concepts, definitions, and important points from the text.

For each flashcard, provide:
1. A clear question or concept on the front
2. A concise answer or explanation on the back

Format your response as JSON with this structure:
{{
  "flashcards": [
    {{
      "front": "Question or concept here",
      "back": "Answer or explanation here"
    }}
  ]
}}

Text to convert:
{text}

Remember to:
- Focus on the most important concepts
- Make questions clear and specific
- Keep answers concise but informative
- Cover different aspects of the content
- Use a variety of question types (definitions, concepts, examples)

Respond only with valid JSON:"""

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
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            
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
                        return Response(flashcards_data)
                    else:
                        # If no JSON found, try to parse the entire response
                        flashcards_data = json.loads(response_text)
                        return Response(flashcards_data)
                        
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
            
            # Get all notes from the notebook
            from .models import Note
            notes = Note.objects.filter(
                notebook_id=notebook_id,
                user=request.user,
                is_deleted=False,
                is_archived=False
            ).order_by('created_at')
            
            if not notes.exists():
                return Response(
                    {"error": "No notes found in this notebook"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Combine all note content
            combined_content = "\n\n".join([
                f"Note: {note.title}\n{note.content}"
                for note in notes
            ])
            
            # Get notebook summary prompt from database configuration
            try:
                summary_prompt = get_ai_config('notebook_summary_prompt', content=combined_content)
            except ValueError:
                # Fallback prompt if configuration not found
                summary_prompt = f"""Please provide a comprehensive summary of the following notebook content. 
                Organize the information into logical sections and highlight key concepts, important dates, and actionable items.
                
                Notebook Content:
                {combined_content}
                
                Please provide:
                1. Executive Summary
                2. Key Topics Covered
                3. Important Dates/Deadlines
                4. Action Items
                5. Related Concepts
                6. Study Recommendations"""
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": summary_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "top_k": 40,
                    "num_predict": 800,
                    "repeat_penalty": 1.1
                }
            }
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
            
            if response.status_code == 200:
                result = response.json()
                summary = result.get('response', '').strip()
                
                if not summary:
                    return Response(
                        {"error": "Failed to generate notebook summary. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                return Response({
                    "summary": summary,
                    "notes_count": notes.count(),
                    "total_content_length": len(combined_content)
                })
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Failed to generate notebook summary. Please try again."},
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
                {"error": "The AI is taking too long to respond. Please try again with a shorter notebook or wait a moment."},
                status=status.HTTP_408_REQUEST_TIMEOUT
            )
        except Exception as e:
            logger.error(f"Error in notebook summarization: {str(e)}")
            return Response(
                {"error": "Failed to generate notebook summary. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=60)
            
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
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            
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
