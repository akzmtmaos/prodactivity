from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
import logging
from huggingface_hub import InferenceClient
import os
from django.conf import settings

logger = logging.getLogger(__name__)

# Initialize Hugging Face client
HF_API_KEY = settings.HUGGINGFACE_API_KEY
logger.info(f"API Key found: {'Yes' if HF_API_KEY else 'No'}")
logger.info(f"API Key length: {len(HF_API_KEY) if HF_API_KEY else 0}")
logger.info(f"API Key prefix: {HF_API_KEY[:4] if HF_API_KEY else 'None'}")

if not HF_API_KEY:
    logger.error("HUGGINGFACE_API_KEY not found in settings")
    raise ValueError("HUGGINGFACE_API_KEY is not set in settings")

logger.info(f"Initializing Hugging Face client with API key: {HF_API_KEY[:4]}...")
client = InferenceClient(token=HF_API_KEY)

class SummarizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get("text", "")
        if not text:
            return Response({"error": "No text provided."}, status=400)
            
        try:
            # Ensure text is not too long for the model
            if len(text) > 1024:
                text = text[:1024]  # Truncate to first 1024 characters
                
            logger.info("Attempting to call Hugging Face API for summarization")
            # Use Hugging Face Inference API for summarization
            response = client.summarization(
                text=text,
                model="facebook/bart-large-cnn",
                clean_up_tokenization_spaces=True
            )
            
            logger.info("Successfully received summary from API")
            return Response({"summary": response.summary_text})
            
        except Exception as e:
            logger.error(f"Error during summarization: {str(e)}")
            return Response({"error": f"Failed to generate summary: {str(e)}"}, status=500)

@api_view(['POST'])
def chat(request):
    try:
        messages = request.data.get('messages', [])
        if not messages:
            return Response({'error': 'No messages provided'}, status=400)
            
        # Add system message if not present
        if not any(msg.get('role') == 'system' for msg in messages):
            messages.insert(0, {
                'role': 'system',
                'content': 'You are a helpful AI assistant that helps users with their notes and documents.'
            })
            
        # Call Hugging Face API
        response = client.chat_completion(
            messages=messages,
            model="HuggingFaceH4/zephyr-7b-beta",  # Updated to a working open-access model
            max_tokens=500,
            temperature=0.7,
            top_p=0.95,
        )
        
        return Response({
            'response': response.choices[0].message.content
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)