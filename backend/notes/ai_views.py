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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ollama API configuration
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama2"  # Using llama2 with optimized configuration

def format_chat_prompt(messages):
    # Llama2-specific system instruction for better behavior
    system_instruction = """<s>[INST] You are a helpful AI assistant. Follow these guidelines:
- Provide clear, direct, and accurate responses
- Do NOT use roleplay elements like *smiles*, *adjusts glasses*, *nods*, etc.
- Be professional, friendly, and concise
- Answer simple questions directly first, then elaborate if needed
- Keep responses focused and relevant to the user's question
- Use natural, conversational language without excessive formatting

Remember: No roleplay elements, no asterisks, just clear helpful responses. [/INST]"""
    
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
        
        # Call Ollama API with streaming - Llama2 optimized settings
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
            
            # Create a summarization prompt
            summarize_prompt = f"Please provide a concise summary of the following text:\n\n{text}\n\nSummary:"
            
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
            
            # Create a review prompt
            review_prompt = f"Please review the following text and provide constructive feedback, suggestions for improvement, and highlight any strengths or weaknesses:\n\n{text}\n\nReview:"
            
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

            # Determine prompt type
            if title.lower().startswith('quiz:'):
                prompt = (
                    "Generate a multiple choice quiz based on the following study material. "
                    "For each question, provide 4 options (A, B, C, D) and indicate the correct answer. "
                    "Format as markdown.\n\n"
                    f"Study Material:\n{text}\n\nQuiz:"
                )
            else:
                prompt = f"Please provide a concise summary of the following text:\n\n{text}\n\nSummary:"

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
