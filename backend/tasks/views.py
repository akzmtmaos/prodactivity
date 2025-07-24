from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task, XPLog, ProductivityLog
from .serializers import TaskSerializer
import logging
from rest_framework.response import Response

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

    def perform_update(self, serializer):
        instance = serializer.save()
        # Award XP if task is completed and not already logged
        if instance.completed:
            if not XPLog.objects.filter(user=instance.user, task=instance).exists():
                XPLog.objects.create(user=instance.user, task=instance, xp=10)
            # Log productivity for today if not already logged, or update if higher
            from django.utils import timezone
            today = timezone.now().date()
            tasks = Task.all_objects.filter(user=instance.user, due_date=today, is_deleted=False)
            total_tasks = tasks.count()
            completed_tasks = tasks.filter(completed=True).count()
            if total_tasks == 0:
                completion_rate = 0
                status = 'No Tasks'
            else:
                completion_rate = completed_tasks / total_tasks * 100
                if completion_rate >= 90:
                    status = 'Highly Productive'
                elif completion_rate >= 70:
                    status = 'Productive'
                elif completion_rate >= 40:
                    status = 'Needs Improvement'
                else:
                    status = 'Low Productivity'
            log, created = ProductivityLog.objects.get_or_create(
                user=instance.user,
                period_type='daily',
                period_start=today,
                period_end=today,
                defaults={
                    'completion_rate': completion_rate,
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'status': status
                }
            )
            if not created and completion_rate > log.completion_rate:
                log.completion_rate = completion_rate
                log.total_tasks = total_tasks
                log.completed_tasks = completed_tasks
                log.status = status
                log.save()
        return instance

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"[TaskViewSet] Error soft-deleting task: {e}")
            return Response({'detail': 'Failed to delete task. Please try again.'}, status=status.HTTP_400_BAD_REQUEST) 