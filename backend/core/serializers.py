from rest_framework import serializers
from .models import TermsAndConditions
from .models import Notification

class TermsAndConditionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TermsAndConditions
        fields = ['id', 'content', 'last_updated']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'notification_type', 'is_read', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
    
    def validate_notification_type(self, value):
        """Validate that notification_type is in allowed choices"""
        valid_types = [choice[0] for choice in Notification.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid notification type. Must be one of: {', '.join(valid_types)}")
        return value 