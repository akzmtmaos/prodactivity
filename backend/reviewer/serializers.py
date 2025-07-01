from rest_framework import serializers
from .models import Reviewer

class ReviewerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reviewer
        fields = [
            'id', 'title', 'content',
            'source_note', 'source_notebook',
            'created_at', 'updated_at', 'is_favorite', 'tags'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data) 