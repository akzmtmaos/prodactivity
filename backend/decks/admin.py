from django.contrib import admin
from .models import Deck, Flashcard, QuizSession

@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'parent', 'created_at', 'flashcard_count')
    list_filter = ('user', 'created_at')
    search_fields = ('title', 'user__username')

@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('front', 'deck', 'user', 'created_at')
    list_filter = ('deck', 'user', 'created_at')
    search_fields = ('front', 'back', 'user__username')

@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'deck', 'score', 'completed_at', 'created_at')
    list_filter = ('user', 'deck', 'completed_at')
    search_fields = ('user__username', 'deck__title')
