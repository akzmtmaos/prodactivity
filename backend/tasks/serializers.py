from rest_framework import serializers
from .models import Task, Subtask

class TaskSerializer(serializers.ModelSerializer):
    subtasks = serializers.SerializerMethodField()
    can_be_completed = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'due_date', 'priority', 
                 'completed', 'category', 'created_at', 'updated_at', 'subtasks',
                 'has_activity', 'activity_notes', 'time_spent_minutes', 'last_activity_at',
                 'evidence_uploaded', 'evidence_description', 'evidence_file', 'evidence_uploaded_at',
                 'can_be_completed']
        read_only_fields = ['created_at', 'updated_at'] 

    def get_subtasks(self, obj):
        return SubtaskSerializer(obj.subtasks.all(), many=True).data

    def get_can_be_completed(self, obj):
        return obj.can_be_completed()


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ['id', 'task', 'title', 'completed', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']