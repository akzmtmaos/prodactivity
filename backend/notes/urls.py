# notes/urls.py
from django.urls import path
from . import views
from .ai_views import SummarizeView, chat, ReviewView, AIAutomaticReviewerView, ConvertToFlashcardsView, NotebookSummaryView, UrgencyDetectionView, SmartChunkingView

urlpatterns = [
    # Note endpoints
    path('', views.NoteListCreateView.as_view(), name='note-list-create'),
    path('<int:pk>/', views.NoteRetrieveUpdateDestroyView.as_view(), name='note-detail'),
    
    # Global search endpoint
    path('global-search/', views.global_search_notes, name='global-search-notes'),
    
    # Notebook endpoints
    path('notebooks/', views.NotebookListCreateView.as_view(), name='notebook-list-create'),
    path('notebooks/<int:pk>/', views.NotebookRetrieveUpdateDestroyView.as_view(), name='notebook-detail'),

    # Summary endpoint
    path('summarize/', SummarizeView.as_view(), name='summarize'),

    # Review endpoint
    path('review/', ReviewView.as_view(), name='review'),

    # AI Automatic Reviewer endpoint
    path('ai-reviewer/', AIAutomaticReviewerView.as_view(), name='ai-automatic-reviewer'),

    # Convert to flashcards endpoint
    path('convert-to-flashcards/', ConvertToFlashcardsView.as_view(), name='convert-to-flashcards'),

    # Document conversion endpoint
    path('convert-doc/', views.convert_doc, name='convert-doc'),

    # Chat endpoint
    path('chat/', chat, name='chat'),

    # NEW AI Endpoints as suggested by professor
    path('notebook-summary/', NotebookSummaryView.as_view(), name='notebook-summary'),
    path('urgency-detection/', UrgencyDetectionView.as_view(), name='urgency-detection'),
    path('smart-chunking/', SmartChunkingView.as_view(), name='smart-chunking'),

    # Deleted notes endpoint
    # path('trash/notes/', deleted_notes, name='deleted-notes'),
    
    # Archive endpoints
    path('archived/notes/', views.archived_notes, name='archived-notes'),
    path('archived/notebooks/', views.archived_notebooks, name='archived-notebooks'),
    
    # Urgency and categorization endpoints
    path('urgent/', views.urgent_notes_and_notebooks, name='urgent-items'),
    path('notes-by-type/', views.notes_by_type, name='notes-by-type'),
    path('notebooks-by-type/', views.notebooks_by_type, name='notebooks-by-type'),
    
    # Export endpoint
    path('export/', views.export_notes, name='export-notes'),
]