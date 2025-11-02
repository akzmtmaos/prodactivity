from rest_framework import serializers
from .models import Reviewer

class ReviewerSerializer(serializers.ModelSerializer):
    source_note_title = serializers.SerializerMethodField()
    source_note_notebook_id = serializers.SerializerMethodField()
    source_notebook_name = serializers.SerializerMethodField()

    class Meta:
        model = Reviewer
        fields = [
            'id', 'title', 'content',
            'source_note', 'source_notebook',
            'source_note_title', 'source_note_notebook_id', 'source_notebook_name',
            'created_at', 'updated_at', 'is_favorite', 'tags',
            'is_deleted', 'deleted_at', 'best_score', 'best_score_correct', 'best_score_total'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'source_note_title', 'source_note_notebook_id', 'source_notebook_name']
    
    def get_source_note_title(self, obj):
        """Get the title of the source note"""
        if obj.source_note:
            try:
                # source_note is a ForeignKey, so we can access the title directly
                return obj.source_note.title
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error getting note title: {e}")
                return None
        return None
    
    def get_source_note_notebook_id(self, obj):
        """Get the notebook ID that contains the source note"""
        if obj.source_note:
            try:
                # source_note is a ForeignKey, we can access notebook.id directly
                if obj.source_note.notebook:
                    return obj.source_note.notebook.id
                return None
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error getting notebook ID: {e}")
                return None
        return None
    
    def get_source_notebook_name(self, obj):
        """Get the name of the source notebook"""
        if obj.source_notebook:
            try:
                # source_notebook is a ForeignKey, we can access name directly
                return obj.source_notebook.name
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error getting notebook name: {e}")
                return None
        return None
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data) 