from django.shortcuts import render
from rest_framework import generics, permissions
from .models import Deck, Flashcard
from .serializers import DeckSerializer, FlashcardSerializer

# Create your views here.

class DeckListCreateView(generics.ListCreateAPIView):
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Deck.objects.filter(user=self.request.user)
        parent_id = self.request.query_params.get('parent', None)
        if parent_id is not None:
            queryset = queryset.filter(parent_id=parent_id)
        return queryset

class DeckRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Deck.objects.filter(user=self.request.user)

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
