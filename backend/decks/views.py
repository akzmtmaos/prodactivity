from django.shortcuts import render
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Deck, Flashcard
from .serializers import DeckSerializer, FlashcardSerializer
from django.utils import timezone

# Create your views here.

class DeckListCreateView(generics.ListCreateAPIView):
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Deck.objects.filter(user=self.request.user, is_deleted=False)
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
