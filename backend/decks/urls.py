from django.urls import path
from . import views
from .views import QuizSessionCreateView

urlpatterns = [
    path('decks/', views.DeckListCreateView.as_view(), name='deck-list-create'),
    path('decks/<int:pk>/', views.DeckRetrieveUpdateDestroyView.as_view(), name='deck-detail'),
    path('flashcards/', views.FlashcardListCreateView.as_view(), name='flashcard-list-create'),
    path('flashcards/<int:pk>/', views.FlashcardRetrieveUpdateDestroyView.as_view(), name='flashcard-detail'),
    # path('trash/decks/', views.deleted_decks, name='deleted-decks'),
    path('archived/decks/', views.archived_decks, name='archived-decks'),
    path('quizzes/sessions/', QuizSessionCreateView.as_view(), name='quizsession-create'),
] 