from django.contrib import admin
from .models import Note, Category

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at', 'notes_count')
    list_filter = ('user', 'created_at')
    search_fields = ('name', 'user__username')

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'user', 'created_at', 'is_deleted')
    list_filter = ('category', 'user', 'created_at', 'is_deleted')
    search_fields = ('title', 'content', 'user__username')
