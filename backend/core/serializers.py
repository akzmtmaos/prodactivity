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
        fields = ['id', 'user', 'message', 'type', 'is_read', 'created_at', 'task', 'event']
        read_only_fields = ['id', 'user', 'created_at', 'task', 'event'] 