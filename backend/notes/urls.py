# notes/urls.py
from django.urls import path
from . import views
from .ai_views import SummarizeView, chat, ReviewView

urlpatterns = [
    # Note endpoints
    path('', views.NoteListCreateView.as_view(), name='note-list-create'),
    path('<int:pk>/', views.NoteRetrieveUpdateDestroyView.as_view(), name='note-detail'),
    
    # Category endpoints
    path('categories/', views.CategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', views.CategoryRetrieveUpdateDestroyView.as_view(), name='category-detail'),

    # Summary endpoint
    path('summarize/', SummarizeView.as_view(), name='summarize'),

    # Review endpoint
    path('review/', ReviewView.as_view(), name='review'),

    # Document conversion endpoint
    path('convert-doc/', views.convert_doc, name='convert-doc'),

    # Chat endpoint
    path('chat/', chat, name='chat'),
]