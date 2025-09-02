from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
import logging
import requests
import os
from reviewer.serializers import ReviewerSerializer
from core.utils import get_ai_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ollama API configuration
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama2:latest"

def format_chat_prompt(messages):
    # Get chat prompt from database configuration
    try:
        # For chat, we'll use a simple system instruction
        system_instruction = """<s>[INST] You are a helpful AI assistant. Follow these guidelines:
- Provide clear, direct, and accurate responses
- Do NOT use roleplay elements like *smiles*, *adjusts glasses*, *nods*, etc.
- Be professional, friendly, and concise
- Answer simple questions directly first, then elaborate if needed
- Keep responses focused and relevant to the user's question
- Use natural, conversational language without excessive formatting

Remember: No roleplay elements, no asterisks, just clear helpful responses. [/INST]"""
    except ValueError:
        # Fallback if no configuration found
        system_instruction = """<s>[INST] You are a helpful AI assistant. [/INST]"""
    
    # Format conversation for Llama2 with proper instruction format
    conversation = [system_instruction]
    
    for msg in messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '').strip()
        
        if content:  # Only include non-empty messages
            if role == 'user':
                conversation.append(f"<s>[INST] {content} [/INST]")
            elif role == 'assistant':
                conversation.append(f"{content}")
    
    # Add the current user prompt if it's a user message
    if messages and messages[-1].get('role') == 'user':
        current_user_content = messages[-1].get('content', '').strip()
        if current_user_content:
            conversation.append(f"<s>[INST] {current_user_content} [/INST]")
    
    return "\n".join(conversation)

@csrf_exempt
@require_http_methods(["POST"])
def chat(request):
    try:
        data = json.loads(request.body)
        messages = data.get('messages', [])
        if not messages:
            return JsonResponse({
                'error': 'No messages provided'
            }, status=400)
        
        # Only keep last 6 user/assistant messages and validate content
        user_assistant_msgs = []
        for msg in messages:
            if msg.get('role') in ('user', 'assistant'):
                content = msg.get('content', '').strip()
                if content:  # Only include messages with actual content
                    user_assistant_msgs.append(msg)
        
        user_assistant_msgs = user_assistant_msgs[-6:]  # Keep last 6 messages
        
        if not user_assistant_msgs:
            return JsonResponse({
                'error': 'No valid messages provided'
            }, status=400)
        
        formatted_prompt = format_chat_prompt(user_assistant_msgs)
        
        # Call Ollama API with streaming - Llama2 optimized settings for 4GB GPU
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": formatted_prompt,
            "stream": True,
            "options": {
                "temperature": 0.2,    # Very low temperature for consistent responses
                "top_p": 0.7,          # Conservative sampling for predictable output
                "top_k": 40,           # Limit vocabulary choices
                "num_predict": 250,    # Shorter responses to avoid rambling
                "repeat_penalty": 1.1, # Prevent repetitive responses
                "stop": ["</s>", "[INST]", "User:", "Assistant:"]  # Stop at instruction markers
            }
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120, stream=True)
        
        if response.status_code == 200:
            # Create a streaming response
            def generate():
                full_response = ""
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if 'response' in data:
                                chunk = data['response']
                                full_response += chunk
                                # Send each chunk to the frontend
                                yield f"data: {json.dumps({'chunk': chunk, 'full_response': full_response})}\n\n"
                            if data.get('done', False):
                                break
                        except json.JSONDecodeError:
                            continue
                
                # Clean up the response and send completion signal
                cleaned_response = full_response.strip()
                
                # Llama2-specific response cleaning
                # Remove any remaining instruction markers
                cleaned_response = cleaned_response.replace("</s>", "").replace("[INST]", "").replace("[/INST]", "")
                cleaned_response = cleaned_response.replace("User:", "").replace("Assistant:", "")
                
                # Remove excessive whitespace and newlines
                cleaned_response = " ".join(cleaned_response.split())
                
                # Basic validation to prevent weird responses
                if len(cleaned_response) < 2:
                    cleaned_response = "I'm sorry, I couldn't generate a proper response. Please try asking your question again."
                
                # Check for roleplay elements and replace them
                roleplay_patterns = [
                    r'\*[^*]+\*',  # Any text in asterisks
                    r'\([^)]*\)',   # Any text in parentheses that might be actions
                ]
                
                import re
                for pattern in roleplay_patterns:
                    cleaned_response = re.sub(pattern, '', cleaned_response)
                
                # Final cleanup
                cleaned_response = cleaned_response.strip()
                
                yield f"data: {json.dumps({'done': True, 'full_response': cleaned_response})}\n\n"
            
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
                    "num_predict": 150,
                    "repeat_penalty": 1.1
                }
            }
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                summary = result.get('response', '').strip()
                
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
                review = result.get('response', '').strip()
                
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

    def post(self, request):
        try:
            text = request.data.get('text', '')
            topic = request.data.get('topic', '')
            
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get smart chunking prompt from database configuration
            try:
                chunking_prompt = get_ai_config('smart_chunking_prompt', content=text)
            except ValueError:
                # Fallback prompt if configuration not found
                chunking_prompt = f"""Analyze the following content and suggest how to break it down into multiple focused notes. Consider:

1. Logical topic divisions
2. Complexity of concepts
3. Study efficiency (not too many small notes, not too few large ones)
4. Related subtopics that could be grouped together
5. Optimal note size for effective learning

Topic: {topic}
Content: {text}

Please respond with ONLY a JSON object in this exact format:
{{
    "suggested_chunks": [
        {{
            "title": "Suggested note title",
            "content_preview": "Brief preview of what this note would contain",
            "key_concepts": ["concept1", "concept2"],
            "estimated_length": "short|medium|long",
            "priority": "low|medium|high"
        }}
    ],
    "total_notes_suggested": 3,
    "reasoning": "Explanation of why this chunking approach was chosen",
    "study_recommendations": ["recommendation1", "recommendation2"]
}}"""
            
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": chunking_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "top_k": 40,
                    "num_predict": 500,
                    "repeat_penalty": 1.1
                }
            }
            
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                try:
                    # Try to parse JSON response
                    import json
                    chunking_data = json.loads(ai_response)
                    
                    return Response(chunking_data)
                except json.JSONDecodeError:
                    # If JSON parsing fails, return a structured response
                    logger.warning("AI response was not valid JSON, returning structured fallback")
                    return Response({
                        "suggested_chunks": [
                            {
                                "title": "Content Analysis",
                                "content_preview": "AI analysis completed but response format was unexpected",
                                "key_concepts": ["analysis"],
                                "estimated_length": "medium",
                                "priority": "medium"
                            }
                        ],
                        "total_notes_suggested": 1,
                        "reasoning": "AI analysis completed but response format was unexpected",
                        "study_recommendations": ["Review the content manually"],
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
