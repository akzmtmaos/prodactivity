from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
import requests
import logging
import json
import re
from .models import Deck, Flashcard
from .serializers import FlashcardSerializer
from core.utils import get_ai_config

logger = logging.getLogger(__name__)

# Ollama API configuration
OLLAMA_API_URL = 'http://localhost:11434/api/generate'
OLLAMA_MODEL = 'deepseek-r1:1.5b'

def clean_ai_response(response_text):
    """Clean AI response by removing thinking tags and other unwanted content"""
    
    # Remove <think>...</think> blocks
    cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
    
    # Remove any remaining instruction markers
    cleaned = cleaned.replace("</s>", "").replace("[INST]", "").replace("[/INST]", "")
    cleaned = cleaned.replace("User:", "").replace("Assistant:", "")
    
    # Remove excessive whitespace and newlines
    cleaned = " ".join(cleaned.split())
    
    # Remove roleplay elements
    roleplay_patterns = [
        r'\*[^*]+\*',  # Any text in asterisks
        r'\([^)]*\)',   # Any text in parentheses that might be actions
    ]
    
    for pattern in roleplay_patterns:
        cleaned = re.sub(pattern, '', cleaned)
    
    return cleaned.strip()

def parse_flashcards_from_ai_response(response_text):
    """Parse flashcards from AI response text"""
    flashcards = []
    
    # Remove <think> tags first
    cleaned_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
    
    # Try to find JSON format first
    try:
        # Look for JSON array in the response - be more flexible with formatting
        json_match = re.search(r'```json\s*(\[.*?\])\s*```', cleaned_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'(\[.*?\])', cleaned_text, re.DOTALL)
        
        if json_match:
            json_str = json_match.group(1) if json_match.groups() else json_match.group()
            
            # Try to fix common JSON formatting issues
            json_str = json_str.replace('\n', ' ').replace('\r', ' ')
            json_str = re.sub(r'\s+', ' ', json_str)  # Normalize whitespace
            
            # Try to fix incomplete JSON arrays
            if json_str.count('[') > json_str.count(']'):
                json_str += ']' * (json_str.count('[') - json_str.count(']'))
            
            parsed_data = json.loads(json_str)
            
            # Check if it's wrapped in a 'flashcards' object
            if isinstance(parsed_data, dict) and 'flashcards' in parsed_data:
                parsed_data = parsed_data['flashcards']
            
            if isinstance(parsed_data, list):
                for item in parsed_data:
                    if isinstance(item, dict):
                        # Check for new format (front/back) first
                        if 'front' in item and 'back' in item:
                            flashcards.append({
                                'question': item['front'].strip(),
                                'answer': item['back'].strip()
                            })
                        # Fallback to old format (question/answer)
                        elif 'question' in item and 'answer' in item:
                            flashcards.append({
                                'question': item['question'].strip(),
                                'answer': item['answer'].strip()
                            })
                if flashcards:
                    return flashcards
    except (json.JSONDecodeError, KeyError):
        pass
    
    # Fallback: Parse Q&A format from the cleaned text
    # Look for patterns like "Q: question" followed by "A: answer"
    qa_pattern = r'Q:\s*(.*?)\s*A:\s*(.*?)(?=Q:|$)'
    matches = re.findall(qa_pattern, cleaned_text, re.DOTALL | re.IGNORECASE)
    
    for question, answer in matches:
        question = question.strip()
        answer = answer.strip()
        if question and answer:
            # AGGRESSIVE POST-PROCESSING: Convert Q&A to Definition-Term format
            # The "question" is actually the term, "answer" is the definition
            # We want: question = definition, answer = term
            flashcards.append({
                'question': answer,  # Definition becomes the question
                'answer': question   # Term becomes the answer
            })
    
    # ULTRA-AGGRESSIVE POST-PROCESSING: Convert ANY Q&A format to Definition-Term
    if flashcards:
        # Check if we have Q&A format and convert it
        converted_flashcards = []
        seen_flashcards = set()  # Track duplicates
        
        for card in flashcards:
            question = card.get('question', '')
            answer = card.get('answer', '')
            
            # If the "question" looks like a term (short, no question words) and "answer" looks like a definition
            if (len(question) < 50 and 
                not any(word in question.lower() for word in ['what', 'how', 'why', 'when', 'where', 'which', 'who']) and
                len(answer) > len(question)):
                # Swap them: definition becomes question, term becomes answer
                definition = answer.strip()
                term = question.strip()
                
                # Clean the definition by removing the term name if it appears at the beginning
                clean_definition = definition
                if definition.lower().startswith(term.lower()):
                    # Remove the term from the beginning of the definition
                    clean_definition = definition[len(term):].strip()
                    # Remove any leading punctuation and capitalize first letter
                    clean_definition = clean_definition.lstrip('.,:;!?').strip()
                    if clean_definition:
                        clean_definition = clean_definition[0].upper() + clean_definition[1:]
                
                # Additional cleaning: remove common patterns that include the term
                clean_definition = clean_definition.replace(f"{term} is", "").replace(f"{term} allows", "").replace(f"{term} hides", "").replace(f"{term} focuses", "").strip()
                if clean_definition.startswith("is "):
                    clean_definition = clean_definition[3:].strip()
                if clean_definition.startswith("allows "):
                    clean_definition = clean_definition[7:].strip()
                if clean_definition.startswith("hides "):
                    clean_definition = clean_definition[6:].strip()
                if clean_definition.startswith("focuses "):
                    clean_definition = clean_definition[8:].strip()
                
                # Create a unique key to prevent duplicates
                unique_key = f"{clean_definition.lower()}|{term.lower()}"
                
                if unique_key not in seen_flashcards:
                    seen_flashcards.add(unique_key)
                    converted_flashcards.append({
                        'question': clean_definition,  # Clean definition becomes the question
                        'answer': term   # Term becomes the answer
                    })
            else:
                # Keep as is, but also check for duplicates
                unique_key = f"{question.lower()}|{answer.lower()}"
                if unique_key not in seen_flashcards:
                    seen_flashcards.add(unique_key)
                    converted_flashcards.append(card)
        
        if converted_flashcards:
            # Limit to maximum 10 flashcards to prevent spam
            return converted_flashcards[:10]
    
    # If still no flashcards, try alternative patterns
    if not flashcards:
        # Look for numbered questions
        numbered_pattern = r'(\d+\.\s*.*?)\n(.*?)(?=\d+\.|$)'
        matches = re.findall(numbered_pattern, cleaned_text, re.DOTALL)
        
        for question, answer in matches:
            question = question.strip()
            answer = answer.strip()
            if question and answer and len(question) > 10 and len(answer) > 10:
                flashcards.append({
                    'question': question,
                    'answer': answer
                })
    
    return flashcards

class AIGenerateFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            content = request.data.get('content', '')
            title = request.data.get('title', '')
            strategy = request.data.get('strategy', 'ai_enhanced')  # ai_enhanced, qa_pattern, heading_pattern
            deck_id = request.data.get('deck_id')
            
            logger.info(f"AIGenerateFlashcardsView POST: content length={len(content)}, title={title}, strategy={strategy}")

            if not content or not content.strip():
                logger.warning("AIGenerateFlashcardsView: No content provided.")
                return Response({'error': 'No content provided.'}, status=400)

            if not deck_id:
                return Response({'error': 'Deck ID is required.'}, status=400)

            # Verify deck exists and belongs to user
            try:
                deck = Deck.objects.get(id=deck_id, user=request.user)
            except Deck.DoesNotExist:
                return Response({'error': 'Deck not found.'}, status=404)

            # Get AI prompt based on strategy
            try:
                if strategy == 'ai_enhanced':
                    prompt = get_ai_config('flashcard_prompt', content=content, title=title)
                elif strategy == 'qa_pattern':
                    prompt = get_ai_config('flashcard_qa_prompt', content=content, title=title)
                elif strategy == 'heading_pattern':
                    prompt = get_ai_config('flashcard_heading_prompt', content=content, title=title)
                else:
                    prompt = get_ai_config('flashcard_prompt', content=content, title=title)
            except ValueError as e:
                logger.error(f"Failed to get AI configuration: {e}")
                return Response(
                    {'error': 'AI configuration not found. Please contact administrator.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Prepare payload for DeepSeek
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 2000,  # Increased for flashcard generation
                    "repeat_penalty": 1.1
                }
            }

            try:
                response = requests.post(
                    OLLAMA_API_URL,
                    json=payload,
                    timeout=60  # Increased timeout for flashcard generation
                )
                response.raise_for_status()
                
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                if not ai_response:
                    logger.warning("Empty response from AI model")
                    return Response({'error': 'AI model returned empty response.'}, status=500)

                # Clean and parse the AI response
                cleaned_response = clean_ai_response(ai_response)
                logger.info(f"AI Response: {cleaned_response[:200]}...")  # Log first 200 chars
                flashcards_data = parse_flashcards_from_ai_response(cleaned_response)
                
                if not flashcards_data:
                    logger.warning("No flashcards could be parsed from AI response")
                    logger.warning(f"Full AI response: {cleaned_response}")
                    return Response({
                        'error': 'Could not generate flashcards from the content. Please try a different strategy or check your content format.',
                        'ai_response': cleaned_response[:500] + '...' if len(cleaned_response) > 500 else cleaned_response
                    }, status=400)

                # Create flashcards in the database
                created_flashcards = []
                for flashcard_data in flashcards_data:
                    flashcard = Flashcard.objects.create(
                        user=request.user,
                        deck=deck,
                        front=flashcard_data['question'],
                        back=flashcard_data['answer']
                    )
                    created_flashcards.append(FlashcardSerializer(flashcard).data)

                # flashcard_count is automatically computed as a property

                logger.info(f"Successfully created {len(created_flashcards)} flashcards for deck {deck_id}")
                
                return Response({
                    'flashcards': created_flashcards,
                    'count': len(created_flashcards),
                    'message': f'Successfully generated {len(created_flashcards)} flashcards!'
                }, status=201)

            except requests.exceptions.RequestException as e:
                logger.error(f"Request to Ollama failed: {e}")
                return Response(
                    {'error': 'AI service is currently unavailable. Please try again later.'}, 
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception as e:
            logger.error(f"Unexpected error in AIGenerateFlashcardsView: {e}")
            return Response(
                {'error': 'An unexpected error occurred. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AIPreviewFlashcardsView(APIView):
    """Preview flashcards without creating them in the database"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            content = request.data.get('content', '')
            title = request.data.get('title', '')
            strategy = request.data.get('strategy', 'ai_enhanced')
            
            logger.info(f"AIPreviewFlashcardsView POST: content length={len(content)}, title={title}, strategy={strategy}")

            if not content or not content.strip():
                return Response({'error': 'No content provided.'}, status=400)

            # Get AI prompt based on strategy
            try:
                if strategy == 'ai_enhanced':
                    prompt = get_ai_config('flashcard_prompt', content=content, title=title)
                elif strategy == 'qa_pattern':
                    prompt = get_ai_config('flashcard_qa_prompt', content=content, title=title)
                elif strategy == 'heading_pattern':
                    prompt = get_ai_config('flashcard_heading_prompt', content=content, title=title)
                else:
                    prompt = get_ai_config('flashcard_prompt', content=content, title=title)
            except ValueError as e:
                logger.error(f"Failed to get AI configuration: {e}")
                return Response(
                    {'error': 'AI configuration not found. Please contact administrator.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Prepare payload for DeepSeek
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 2000,
                    "repeat_penalty": 1.1
                }
            }

            try:
                response = requests.post(
                    OLLAMA_API_URL,
                    json=payload,
                    timeout=60
                )
                response.raise_for_status()
                
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                if not ai_response:
                    return Response({'error': 'AI model returned empty response.'}, status=500)

                # Clean and parse the AI response
                cleaned_response = clean_ai_response(ai_response)
                flashcards_data = parse_flashcards_from_ai_response(cleaned_response)
                
                return Response({
                    'flashcards': flashcards_data,
                    'count': len(flashcards_data),
                    'ai_response': cleaned_response[:1000] + '...' if len(cleaned_response) > 1000 else cleaned_response
                }, status=200)

            except requests.exceptions.RequestException as e:
                logger.error(f"Request to Ollama failed: {e}")
                return Response(
                    {'error': 'AI service is currently unavailable. Please try again later.'}, 
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception as e:
            logger.error(f"Unexpected error in AIPreviewFlashcardsView: {e}")
            return Response(
                {'error': 'An unexpected error occurred. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
