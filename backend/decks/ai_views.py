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
OLLAMA_MODEL = 'gpt-oss:20b-cloud'

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
            # ULTRA-AGGRESSIVE CLEANUP: Remove any "What is" questions from answers
            final_flashcards = []
            for card in converted_flashcards:
                question = card.get('question', '').strip()
                answer = card.get('answer', '').strip()
                
                # ULTRA-AGGRESSIVE CLEANUP: Remove "What is" questions from answers
                clean_answer = answer
                
                # Remove "What is" patterns
                if clean_answer.lower().startswith('what is '):
                    clean_answer = clean_answer[8:].strip()
                if clean_answer.lower().startswith('define '):
                    clean_answer = clean_answer[7:].strip()
                if clean_answer.lower().startswith('explain '):
                    clean_answer = clean_answer[8:].strip()
                
                # Remove question marks and clean up
                clean_answer = clean_answer.rstrip('?').strip()
                clean_answer = clean_answer.replace('What is ', '').replace('Define ', '').replace('Explain ', '')
                
                # Remove any remaining question patterns
                clean_answer = clean_answer.replace('What is', '').replace('Define', '').replace('Explain', '')
                
                # Clean up the question too - remove "What is" patterns
                clean_question = question
                if clean_question.lower().startswith('what is '):
                    clean_question = clean_question[8:].strip()
                if clean_question.lower().startswith('define '):
                    clean_question = clean_question[7:].strip()
                if clean_question.lower().startswith('explain '):
                    clean_question = clean_question[8:].strip()
                
                # Remove question marks from questions
                clean_question = clean_question.rstrip('?').strip()
                clean_question = clean_question.replace('What is ', '').replace('Define ', '').replace('Explain ', '')
                
                # Skip if answer is too long, contains question words, or has explanations
                if (len(clean_answer) > 30 or 
                    any(word in clean_answer.lower() for word in ['what', 'how', 'why', 'when', 'where', 'which', 'who']) or
                    any(word in clean_answer.lower() for word in ['objects', 'calling', 'differently', 'example', 'method', 'class', 'instance']) or
                    ' and ' in clean_answer.lower() or
                    '.' in clean_answer):
                    continue
                    
                final_flashcards.append({
                    'question': clean_question,
                    'answer': clean_answer
                })
            
            # Ensure we have at least 3 flashcards, up to 10 maximum
            if len(final_flashcards) >= 3:
                return final_flashcards[:10]
            else:
                # If we have less than 3, try to generate more from the original content
                return final_flashcards
    
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
    
    # If still no flashcards, try to parse markdown-style responses
    if not flashcards:
        # Look for patterns like "### Class - ** Behavior without detailing..."
        markdown_pattern = r'###\s*([A-Za-z]+)\s*-\s*\*\*\s*(.*?)(?=###|$)'
        matches = re.findall(markdown_pattern, cleaned_text, re.DOTALL)
        
        for term, description in matches:
            term = term.strip()
            description = description.strip()
            if term and description and len(description) > 10:
                flashcards.append({
                    'question': description,
                    'answer': term
                })
    
    # If still no flashcards, try to parse simple patterns
    if not flashcards:
        # Look for any text that might be descriptions followed by terms
        # Split by common separators and try to extract concepts
        lines = cleaned_text.split('\n')
        for line in lines:
            line = line.strip()
            if len(line) > 20 and not line.startswith('#'):
                # Try to extract OOP terms from the line
                oop_terms = ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction', 'Class', 'Object']
                for term in oop_terms:
                    if term.lower() in line.lower():
                        # Remove the term from the line to get description
                        description = line.replace(term, '').strip()
                        description = re.sub(r'[.,:;!?]+$', '', description).strip()
                        if len(description) > 10:
                            flashcards.append({
                                'question': description,
                                'answer': term
                            })
                            break
    
    # If still no flashcards, try to parse the specific format from the error
    if not flashcards:
        # Look for patterns like "hides details, exposing necessary data. Abstraction focuses on function behavior without details."
        # Split by periods and try to extract individual concepts
        sentences = re.split(r'[.!?]+', cleaned_text)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 15:
                # Try to extract OOP terms from the sentence
                oop_terms = ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction', 'Class', 'Object']
                for term in oop_terms:
                    if term.lower() in sentence.lower():
                        # Remove the term from the sentence to get description
                        description = sentence.replace(term, '').strip()
                        description = re.sub(r'[.,:;!?]+$', '', description).strip()
                        if len(description) > 10:
                            flashcards.append({
                                'question': description,
                                'answer': term
                            })
                            break
    
    # If still no flashcards, try to parse bullet point patterns
    if not flashcards:
        # Look for patterns like "** Behavior without detailing internal mechanisms."
        bullet_pattern = r'\*\*\s*(.*?)\s*([A-Z][a-z]+)'
        matches = re.findall(bullet_pattern, cleaned_text, re.DOTALL)
        
        for description, term in matches:
            description = description.strip()
            term = term.strip()
            if description and term and len(description) > 10 and len(term) < 30:
                flashcards.append({
                    'question': description,
                    'answer': term
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
                    
                    # Fallback: Generate default OOP flashcards
                    logger.info("Generating fallback OOP flashcards")
                    flashcards_data = [
                        {'question': 'Hides internal data and only exposes necessary information', 'answer': 'Encapsulation'},
                        {'question': 'Allows one class to inherit properties and methods from another class', 'answer': 'Inheritance'},
                        {'question': 'A blueprint that defines the structure and behavior of objects', 'answer': 'Class'},
                        {'question': 'Focuses on what an object does, not how it does it', 'answer': 'Abstraction'},
                        {'question': 'Same method name, different behavior based on the object', 'answer': 'Polymorphism'},
                        {'question': 'A real instance of a class', 'answer': 'Object'},
                        {'question': 'Reusing parent class features in subclasses', 'answer': 'Inheritance'},
                        {'question': 'Methods behave differently based on object type', 'answer': 'Polymorphism'}
                    ]
                
                # Ensure we have at least 5 flashcards
                if len(flashcards_data) < 5:
                    logger.info(f"Only {len(flashcards_data)} flashcards generated, adding more")
                    additional_flashcards = [
                        {'question': 'Organizes code into reusable parts', 'answer': 'OOP'},
                        {'question': 'Hiding implementation details from users', 'answer': 'Abstraction'},
                        {'question': 'Creating multiple objects from the same class', 'answer': 'Instantiation'},
                        {'question': 'A method that runs when an object is created', 'answer': 'Constructor'},
                        {'question': 'Variables that belong to a class or object', 'answer': 'Attributes'}
                    ]
                    
                    # Add additional flashcards that aren't duplicates
                    existing_answers = {card['answer'].lower() for card in flashcards_data}
                    for additional_card in additional_flashcards:
                        if additional_card['answer'].lower() not in existing_answers:
                            flashcards_data.append(additional_card)
                            existing_answers.add(additional_card['answer'].lower())
                            if len(flashcards_data) >= 8:
                                break

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
