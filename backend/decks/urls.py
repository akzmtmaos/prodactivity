from django.urls import path
from . import views

urlpatterns = [
    path('decks/', views.DeckListCreateView.as_view(), name='deck-list-create'),
    path('decks/<int:pk>/', views.DeckRetrieveUpdateDestroyView.as_view(), name='deck-detail'),
    path('flashcards/', views.FlashcardListCreateView.as_view(), name='flashcard-list-create'),
    path('flashcards/<int:pk>/', views.FlashcardRetrieveUpdateDestroyView.as_view(), name='flashcard-detail'),
] 