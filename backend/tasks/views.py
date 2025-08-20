from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
# from django_filters.rest_framework import DjangoFilterBackend
from .models import Task, XPLog, ProductivityLog, Subtask
from .serializers import TaskSerializer, SubtaskSerializer
# from .utils import get_user_local_date_from_request
import logging
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # filterset_fields = ['completed', 'priority', 'category']  # Temporarily disabled
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'title', 'category']
    ordering = ['due_date', 'priority']

    def get_queryset(self):
        logger.debug(f"[TaskViewSet] get_queryset called by user: {self.request.user} (auth: {self.request.user.is_authenticated})")
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        try:
            logger.debug(f"[TaskViewSet] perform_create called by user: {self.request.user} (auth: {self.request.user.is_authenticated})")
            task = serializer.save(user=self.request.user)
            logger.debug(f"[TaskViewSet] Task created successfully. Title: {task.title}, Completed: {task.completed}, Due Date: {task.due_date}")
            
            # Update productivity for today if the new task is due today
            
            # Use Philippine time (UTC+8)
            utc_now = timezone.now()
            ph_time = utc_now + timedelta(hours=8)
            today = ph_time.date()
            
            logger.debug(f"[TaskViewSet] Task due_date: {task.due_date}, Today (Philippine): {today}, Equal: {task.due_date == today}")
            
            if task.due_date == today:
                logger.debug(f"[TaskViewSet] Updating productivity for today's task")
                self._update_today_productivity(self.request.user)
            else:
                logger.debug(f"[TaskViewSet] Task not due today, skipping productivity update")
        except Exception as e:
            logger.error(f"[TaskViewSet] Error creating task: {e}")
            raise 

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Check if task is being marked as completed
        if instance.completed:
            # Validate that the task can be completed
            if not instance.can_be_completed():
                # Revert the completion status
                instance.completed = False
                instance.save()
                from rest_framework.exceptions import ValidationError
                
                missing = self._get_missing_requirements(instance)
                error_message = f"You cannot mark this task as complete. Missing: {', '.join(missing)}. Please log activity and provide evidence first."
                
                raise ValidationError({
                    'completed': error_message
                })
            
            # Award XP if task is completed and not already logged
            if not XPLog.objects.filter(user=instance.user, task=instance).exists():
                XPLog.objects.create(user=instance.user, task=instance, xp=10)
            
            # Update productivity for today
            self._update_today_productivity(instance.user)
        
        return instance
    
    def _update_today_productivity(self, user):
        """Update productivity for today's tasks"""
        
        # Use Philippine time (UTC+8)
        utc_now = timezone.now()
        ph_time = utc_now + timedelta(hours=8)
        today = ph_time.date()
        
        logger.debug(f"[_update_today_productivity] Using Philippine date: {today}")
        
        tasks = Task.all_objects.filter(user=user, due_date=today, is_deleted=False)
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(completed=True).count()
        
        logger.debug(f"[_update_today_productivity] Total tasks: {total_tasks}, Completed: {completed_tasks}")
        
        logger.debug(f"[_update_today_productivity] Today: {today}")
        logger.debug(f"[_update_today_productivity] Total tasks: {total_tasks}, Completed: {completed_tasks}")
        
        # Log all tasks for debugging
        for task in tasks:
            logger.debug(f"[_update_today_productivity] Task: {task.title}, Completed: {task.completed}")
        
        if total_tasks == 0:
            completion_rate = 0
            status = 'No Tasks'
        else:
            completion_rate = completed_tasks / total_tasks * 100
            logger.debug(f"[_update_today_productivity] Completion rate: {completion_rate}%")
            
            if completion_rate >= 90:
                status = 'Highly Productive'
            elif completion_rate >= 70:
                status = 'Productive'
            elif completion_rate >= 40:
                status = 'Needs Improvement'
            else:
                status = 'Low Productivity'
        
        logger.debug(f"[_update_today_productivity] Final status: {status}")
        
        # Update or create productivity log for today
        log, created = ProductivityLog.objects.get_or_create(
            user=user,
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
        
        # Update existing log if completion rate is higher
        if not created and completion_rate > log.completion_rate:
            log.completion_rate = completion_rate
            log.total_tasks = total_tasks
            log.completed_tasks = completed_tasks
            log.status = status
            log.save()
            logger.debug(f"[_update_today_productivity] Updated existing log")
        elif created:
            logger.debug(f"[_update_today_productivity] Created new log")
        else:
            logger.debug(f"[_update_today_productivity] No update needed")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"[TaskViewSet] Error soft-deleting task: {e}")
            return Response({'detail': 'Failed to delete task. Please try again.'}, status=status.HTTP_400_BAD_REQUEST) 

    @action(detail=True, methods=['post'])
    def log_activity(self, request, pk=None):
        """Log activity on a task (mark as having activity)"""
        task = self.get_object()
        
        # Mark that user has done some work on this task
        task.has_activity = True
        task.last_activity_at = timezone.now()
        task.save()
        
        return Response({'message': 'Activity logged successfully'})

    @action(detail=True, methods=['post'])
    def add_time(self, request, pk=None):
        """Add time spent working on a task"""
        task = self.get_object()
        minutes = request.data.get('minutes', 0)
        
        if not minutes or minutes <= 0:
            return Response({'error': 'Please provide a valid number of minutes'}, status=status.HTTP_400_BAD_REQUEST)
        
        task.time_spent_minutes += minutes
        task.has_activity = True
        task.last_activity_at = timezone.now()
        task.save()
        
        return Response({
            'message': f'Added {minutes} minutes to task',
            'total_time_spent': task.time_spent_minutes
        })

    @action(detail=True, methods=['post'])
    def add_notes(self, request, pk=None):
        """Add activity notes to a task"""
        task = self.get_object()
        notes = request.data.get('notes', '').strip()
        
        if not notes:
            return Response({'error': 'Please provide activity notes'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Append to existing notes or create new
        if task.activity_notes:
            task.activity_notes += f"\n\n{timezone.now().strftime('%Y-%m-%d %H:%M')}: {notes}"
        else:
            task.activity_notes = f"{timezone.now().strftime('%Y-%m-%d %H:%M')}: {notes}"
        
        task.has_activity = True
        task.last_activity_at = timezone.now()
        task.save()
        
        return Response({'message': 'Activity notes added successfully'})

    @action(detail=True, methods=['post'])
    def upload_evidence(self, request, pk=None):
        """Upload evidence for task completion"""
        task = self.get_object()
        
        # Check if file is provided
        evidence_file = request.FILES.get('evidence_file')
        evidence_description = request.data.get('evidence_description', '').strip()
        
        if not evidence_file and not evidence_description:
            return Response({
                'error': 'Please provide either a file or description as evidence'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save evidence
        if evidence_file:
            task.evidence_file = evidence_file
        
        if evidence_description:
            task.evidence_description = evidence_description
        
        task.evidence_uploaded = True
        task.evidence_uploaded_at = timezone.now()
        task.save()
        
        return Response({
            'message': 'Evidence uploaded successfully',
            'has_evidence': task.evidence_uploaded,
            'can_be_completed': task.can_be_completed()
        })

    @action(detail=True, methods=['get'])
    def evidence_status(self, request, pk=None):
        """Get the current evidence and completion status"""
        task = self.get_object()
        
        return Response({
            'has_activity': task.has_activity,
            'time_spent_minutes': task.time_spent_minutes,
            'has_activity_notes': bool(task.activity_notes and len(task.activity_notes.strip()) > 10),
            'evidence_uploaded': task.evidence_uploaded,
            'has_evidence_file': bool(task.evidence_file),
            'has_evidence_description': bool(task.evidence_description and len(task.evidence_description.strip()) > 20),
            'can_be_completed': task.can_be_completed(),
            'missing_requirements': self._get_missing_requirements(task)
        })

    def _get_missing_requirements(self, task):
        """Get list of missing requirements for task completion"""
        missing = []
        
        # Check basic activity
        has_basic_activity = (
            task.has_activity or 
            task.time_spent_minutes >= 5 or 
            (task.activity_notes and len(task.activity_notes.strip()) > 10)
        )
        
        if not has_basic_activity:
            missing.append('Work activity (log time, add notes, or mark as worked on)')
        
        # Check evidence
        has_evidence = (
            task.evidence_uploaded and 
            (task.evidence_file or (task.evidence_description and len(task.evidence_description.strip()) > 20))
        )
        
        if not has_evidence:
            missing.append('Evidence of work (upload file or provide detailed description)')
        
        return missing


class SubtaskViewSet(viewsets.ModelViewSet):
    serializer_class = SubtaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subtask.objects.filter(task__user=self.request.user)

    def perform_create(self, serializer):
        subtask = serializer.save()
        if subtask.task.user != self.request.user:
            # Revert and forbid
            subtask.delete()
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to create a subtask for this task.")
        return subtask