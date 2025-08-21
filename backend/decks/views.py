from django.shortcuts import render
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Deck, Flashcard, QuizSession
from .serializers import DeckSerializer, FlashcardSerializer
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import status

# Create your views here.

class DeckListCreateView(generics.ListCreateAPIView):
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by archive status
        is_archived = self.request.query_params.get('archived', 'false').lower() == 'true'
        queryset = Deck.objects.filter(user=self.request.user, is_deleted=False, is_archived=is_archived)
        parent_id = self.request.query_params.get('parent', None)
        if parent_id is not None:
            queryset = queryset.filter(parent_id=parent_id)
        return queryset

class DeckRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Deck.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        deck = self.get_object()
        if deck.is_deleted:
            deck.delete()
            return Response(status=204)
        deck.is_deleted = True
        deck.deleted_at = timezone.now()
        deck.save()
        return Response(status=204)

    def partial_update(self, request, *args, **kwargs):
        deck = self.get_object()
        print(f"[DEBUG] PATCH /api/decks/decks/{deck.id}/ - data: {request.data}")
        
        # Handle archive status
        is_archived = request.data.get('is_archived', None)
        if is_archived is not None:
            deck.is_archived = is_archived
            deck.archived_at = timezone.now() if is_archived else None
            deck.save()
            print(f"[DEBUG] Deck {deck.id} updated: is_archived={deck.is_archived}, archived_at={deck.archived_at}")
        
        # Handle delete status
        is_deleted = request.data.get('is_deleted', None)
        if is_deleted is not None:
            deck.is_deleted = is_deleted
            deck.deleted_at = None if not is_deleted else timezone.now()
            deck.save()
            print(f"[DEBUG] Deck {deck.id} updated: is_deleted={deck.is_deleted}, deleted_at={deck.deleted_at}")
        
        serializer = self.get_serializer(deck)
        return Response(serializer.data)

class FlashcardListCreateView(generics.ListCreateAPIView):
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Flashcard.objects.filter(user=self.request.user)
        deck_id = self.request.query_params.get('deck', None)
        if deck_id is not None:
            queryset = queryset.filter(deck_id=deck_id)
        return queryset

class FlashcardRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Flashcard.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deleted_decks(request):
    decks = Deck.objects.filter(user=request.user, is_deleted=True)
    print(f"[DEBUG] Trash API - User: {request.user}, Deleted Decks: {list(decks.values('id', 'title', 'is_deleted', 'deleted_at'))}")
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def archived_decks(request):
    decks = Deck.objects.filter(user=request.user, is_archived=True, is_deleted=False)
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)

class QuizSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        deck_id = request.data.get('deck')
        score = request.data.get('score', 0)
        completed_at = request.data.get('completed_at', timezone.now())
        if not deck_id:
            return Response({'error': 'deck is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            deck = Deck.objects.get(id=deck_id, user=user)
        except Deck.DoesNotExist:
            return Response({'error': 'Deck not found'}, status=status.HTTP_404_NOT_FOUND)
        quiz_session = QuizSession.objects.create(user=user, deck=deck, score=score, completed_at=completed_at)
        # Auto-increment deck progress (by score/10, max 100)
        increment = int(score) // 10 if score else 10
        deck.progress = min(100, deck.progress + increment)
        deck.save()
        return Response({
            'id': quiz_session.id,
            'user': quiz_session.user.id,
            'deck': quiz_session.deck.id,
            'score': quiz_session.score,
            'completed_at': quiz_session.completed_at,
            'created_at': quiz_session.created_at,
            'deck_progress': deck.progress
        }, status=status.HTTP_201_CREATED)
