# notes/serializers.py
from rest_framework import serializers
from .models import Notebook, Note

class NotebookSerializer(serializers.ModelSerializer):
    notes_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Notebook
        fields = ['id', 'name', 'created_at', 'updated_at', 'notes_count', 'is_archived', 'archived_at', 'is_favorite', 'is_deleted', 'deleted_at']
        read_only_fields = ['id', 'created_at', 'updated_at'] 
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class NoteSerializer(serializers.ModelSerializer):
    notebook_name = serializers.CharField(source='notebook.name', read_only=True)
    
    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'notebook', 'notebook_name', 'note_type', 'priority', 'is_urgent', 'tags', 'created_at', 'updated_at', 'is_deleted', 'deleted_at', 'is_archived', 'archived_at', 'last_visited']
        read_only_fields = ['id', 'created_at', 'updated_at', 'notebook_name']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)