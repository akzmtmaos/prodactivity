from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
import os
import logging
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model and tokenizer
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Using device: {device}")

model = None
tokenizer = None

try:
    model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-large-cnn")
    tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
    model = model.to(device)
    logger.info("Model and tokenizer loaded successfully")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")

# System prompt to guide the model's behavior
SYSTEM_PROMPT = """You are a helpful AI assistant. You provide clear, concise, and accurate responses.
You are respectful, honest, and avoid harmful or inappropriate content.
You maintain a professional and friendly tone."""

def format_chat_prompt(messages):
    """Format messages into a prompt for the model."""
    formatted_prompt = ""
    for msg in messages:
        role = msg.get('role', '')
        content = msg.get('content', '')
        if role == 'system':
            formatted_prompt += f"System: {content}\n"
        elif role == 'user':
            formatted_prompt += f"Human: {content}\n"
        elif role == 'assistant':
            formatted_prompt += f"Assistant: {content}\n"
    formatted_prompt += "Assistant: "
    return formatted_prompt

@csrf_exempt
@require_http_methods(["POST"])
def chat(request):
    if not model or not tokenizer:
        return JsonResponse({
            "error": "AI model is not available. Please try again later."
        }, status=503)

    try:
        data = json.loads(request.body)
        messages = data.get('messages', [])
        
        if not messages:
            return JsonResponse({
                'error': 'No messages provided'
            }, status=400)
        
        # Add system prompt if not present
        if not any(msg.get('role') == 'system' for msg in messages):
            messages.insert(0, {'role': 'system', 'content': SYSTEM_PROMPT})
        
        # Format messages for the model
        formatted_prompt = format_chat_prompt(messages)
        
        # Tokenize input
        inputs = tokenizer(formatted_prompt, return_tensors="pt", max_length=512, truncation=True)
        inputs = inputs.to(device)
        
        # Generate response with optimized parameters
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=256,
                num_return_sequences=1,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.2,
                no_repeat_ngram_size=3
            )
        
        # Decode and clean up the response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = response.replace(formatted_prompt, "").strip()
        
        return JsonResponse({
            'response': response
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return JsonResponse({
            'error': str(e)
        }, status=500)

class SummarizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not model or not tokenizer:
            return Response(
                {"error": "AI model is not available. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            text = request.data.get('text', '')
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Tokenize input
            inputs = tokenizer(text, max_length=1024, truncation=True, return_tensors="pt")
            inputs = inputs.to(device)
            
            # Generate summary with optimized parameters
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_length=130,
                    min_length=30,
                    num_beams=4,
                    length_penalty=2.0,
                    early_stopping=True
                )
            
            # Decode and clean up the summary
            summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            if not summary:
                return Response(
                    {"error": "Failed to generate summary. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({"summary": summary})
            
        except Exception as e:
            logger.error(f"Error in summarization: {str(e)}")
            return Response(
                {"error": "Failed to generate summary. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not model or not tokenizer:
            return Response(
                {"error": "AI model is not available. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        try:
            text = request.data.get('text', '')
            if not text:
                return Response(
                    {"error": "No text provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Compose a review prompt
            review_prompt = (
                "You are an expert reviewer. Read the following note and provide constructive feedback, suggestions for improvement, and highlight any strengths or weaknesses.\n\nNote Content:\n" + text + "\n\nReview:" 
            )
            inputs = tokenizer(review_prompt, max_length=1024, truncation=True, return_tensors="pt")
            inputs = inputs.to(device)
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_length=256,
                    min_length=50,
                    num_beams=4,
                    length_penalty=2.0,
                    early_stopping=True
                )
            review = tokenizer.decode(outputs[0], skip_special_tokens=True)
            if not review:
                return Response(
                    {"error": "Failed to generate review. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response({"review": review})
        except Exception as e:
            logger.error(f"Error in review: {str(e)}")
            return Response(
                {"error": "Failed to generate review. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


