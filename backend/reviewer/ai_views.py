from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import requests
import logging
from .serializers import ReviewerSerializer
from rest_framework.decorators import api_view, permission_classes
from .models import Reviewer

logger = logging.getLogger(__name__)

OLLAMA_API_URL = 'http://localhost:11434/api/generate'
OLLAMA_MODEL = 'llama2'

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
                    "Generate a multiple choice quiz with 10 questions based on the following study material. "
                    "For each question: Start with the question number and question text on its own line. "
                    "Put each answer option (A, B, C, D) on a separate line, like this:\n"
                    "1. What is the capital of France?\n"
                    "A. Berlin\n"
                    "B. Madrid\n"
                    "C. Paris\n"
                    "D. Rome\n"
                    "**Answer:** C\n\n"
                    "Do not put options on the same line as the question. Indicate the correct answer. Format as markdown.\n\n"
                    f"Study Material:\n{text}\n\nQuiz:"
                )
            else:
                prompt = (
                    "Review the following content and provide:\n"
                    "- A concise summary.\n"
                    "- A list of important terms with brief explanations.\n"
                    "- Key points and main ideas.\n"
                    "- The main idea(s).\n"
                    "Do not include section headers or labels. Use bullet points or short paragraphs for clarity.\n\n"
                    f"Content:\n{text}"
                )

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,
                    "top_k": 40,
                    "num_predict": 1000,
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deleted_reviewers(request):
    reviewers = Reviewer.objects.filter(user=request.user, is_deleted=True)
    print(f"[DEBUG] Trash API - User: {request.user}, Deleted Reviewers: {list(reviewers.values('id', 'title', 'is_deleted', 'deleted_at'))}")
    serializer = ReviewerSerializer(reviewers, many=True)
    return Response(serializer.data) 