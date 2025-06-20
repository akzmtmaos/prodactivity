from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task
from .serializers import TaskSerializer
import logging

logger = logging.getLogger(__name__)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['completed', 'priority', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'title', 'category']
    ordering = ['due_date', 'priority']

    def get_queryset(self):
        logger.debug(f"[TaskViewSet] get_queryset called by user: {self.request.user} (auth: {self.request.user.is_authenticated})")
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        try:
            logger.debug(f"[TaskViewSet] perform_create called by user: {self.request.user} (auth: {self.request.user.is_authenticated})")
            serializer.save(user=self.request.user)
            logger.debug("[TaskViewSet] Task created successfully.")
        except Exception as e:
            logger.error(f"[TaskViewSet] Error creating task: {e}")
            raise 