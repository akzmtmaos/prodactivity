from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'due_date', 'priority', 
                 'completed', 'category', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at'] 