# notes/serializers.py
from rest_framework import serializers
from .models import Category, Note

class CategorySerializer(serializers.ModelSerializer):
    notes_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at', 'updated_at', 'notes_count']
        read_only_fields = ['id', 'created_at', 'updated_at'] 
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class NoteSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'category', 'category_name', 
                 'created_at', 'updated_at', 'last_visited', 'is_deleted']
        read_only_fields = ['id', 'created_at', 'updated_at', 'category_name']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate_category(self, value):
        # Ensure user can only create notes in their own categories
        if value.user != self.context['request'].user:
            raise serializers.ValidationError("You can only create notes in your own categories.")
        return value

    def validate(self, data):
        # Default title to 'Untitled Note' if missing or blank
        title = data.get('title', '').strip()
        if not title:
            data['title'] = 'Untitled Note'
        return data