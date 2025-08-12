from rest_framework import serializers
from .models import Task, Subtask

class TaskSerializer(serializers.ModelSerializer):
    subtasks = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'due_date', 'priority', 
                 'completed', 'category', 'created_at', 'updated_at', 'subtasks']
        read_only_fields = ['created_at', 'updated_at'] 

    def get_subtasks(self, obj):
        return SubtaskSerializer(obj.subtasks.all(), many=True).data


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ['id', 'task', 'title', 'completed', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']