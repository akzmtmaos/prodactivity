# notes/serializers.py
from rest_framework import serializers
from .models import Notebook, Note

class NotebookSerializer(serializers.ModelSerializer):
    notes_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Notebook
        fields = ['id', 'name', 'created_at', 'updated_at', 'notes_count']
        read_only_fields = ['id', 'created_at', 'updated_at'] 
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class NoteSerializer(serializers.ModelSerializer):
    notebook_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'notebook', 'notebook_name', 
                 'created_at', 'updated_at', 'last_visited', 'is_deleted']
        read_only_fields = ['id', 'created_at', 'updated_at', 'notebook_name']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # Only set default title for new notes
        if not validated_data.get('title', '').strip():
            validated_data['title'] = 'Untitled Note'
        return super().create(validated_data)
    
    def validate_notebook(self, value):
        # Ensure user can only create notes in their own notebooks
        if value.user != self.context['request'].user:
            raise serializers.ValidationError("You can only create notes in your own notebooks.")
        return value

    def validate(self, data):
        # Only validate title for new notes
        if not self.instance and not data.get('title', '').strip():
            data['title'] = 'Untitled Note'
        return data