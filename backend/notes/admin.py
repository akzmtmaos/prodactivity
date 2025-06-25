from django.contrib import admin
from .models import Note, Notebook

@admin.register(Notebook)
class NotebookAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at', 'updated_at')
    search_fields = ('name', 'user__username')

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'notebook', 'user', 'created_at', 'is_deleted')
    list_filter = ('notebook', 'user', 'created_at', 'is_deleted')
    search_fields = ('title', 'content', 'user__username')
