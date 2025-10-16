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
from django.db import models

logger = logging.getLogger(__name__)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # filterset_fields = ['completed', 'priority', 'category']  # Temporarily disabled
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'title', 'task_category']
    ordering = ['due_date', 'priority']
    pagination_class = None  # Disable pagination for tasks

    def get_queryset(self):
        logger.debug(f"[TaskViewSet] get_queryset called by user: {self.request.user} (auth: {self.request.user.is_authenticated})")
        queryset = Task.objects.filter(user=self.request.user)
        
        # Custom filtering for task_category
        task_category = self.request.query_params.get('task_category', None)
        if task_category:
            queryset = queryset.filter(task_category__icontains=task_category)
        
        # Custom filtering for completed status
        completed = self.request.query_params.get('completed', None)
        if completed is not None:
            completed_bool = completed.lower() == 'true'
            queryset = queryset.filter(completed=completed_bool)
        
        # Custom filtering for priority
        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        logger.debug(f"[TaskViewSet] Final queryset count: {queryset.count()}")
        return queryset

    def perform_create(self, serializer):
        try:
            logger.debug(f"[TaskViewSet] perform_create called by user: {self.request.user} (auth: {self.request.user.is_authenticated})")
            task = serializer.save(user=self.request.user)
            logger.debug(f"[TaskViewSet] Task created successfully. Title: {task.title}, Completed: {task.completed}, Due Date: {task.due_date}")
            
            # Update productivity for today if the new task is due today
            
            # Use local time (system timezone)
            today = timezone.now().date()
            
            logger.debug(f"[TaskViewSet] Task due_date: {task.due_date}, Today (local): {today}, Equal: {task.due_date == today}")
            
            if task.due_date == today:
                logger.debug(f"[TaskViewSet] Updating productivity for today's task")
                self._update_productivity_for_date(self.request.user, task.due_date)
            else:
                logger.debug(f"[TaskViewSet] Task not due today, skipping productivity update")
        except Exception as e:
            logger.error(f"[TaskViewSet] Error creating task: {e}")
            raise 

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Check if task is being marked as completed
        if instance.completed and not instance.completed_at:
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
            
            # Use the new mark_completed method to set completion timestamp
            instance.mark_completed()
            
            # Award XP if task is completed and not already logged
            if not XPLog.objects.filter(user=instance.user, task=instance).exists():
                # Check if task is overdue (completed after due date)
                from django.utils import timezone
                today = timezone.now().date()
                is_overdue = instance.due_date < today
                
                # Award half XP (5) for overdue tasks, full XP (10) for on-time tasks
                xp_amount = 5 if is_overdue else 10
                XPLog.objects.create(user=instance.user, task=instance, xp=xp_amount)
            else:
                # If XP log exists, check if it's overdue
                from django.utils import timezone
                today = timezone.now().date()
                is_overdue = instance.due_date < today
            
            # IMPORTANT: Only update productivity if task was completed on time
            # Late tasks (completed after due date) should NOT count toward productivity
            if not is_overdue:
                print(f"✅ Task completed ON TIME - updating productivity for {instance.due_date}")
                self._update_productivity_for_date(instance.user, instance.due_date)
            else:
                print(f"⏰ Task completed LATE (due: {instance.due_date}, completed: {today}) - NOT counting toward productivity")
                # Still recalculate to reflect the incomplete late task
                self._update_productivity_for_date(instance.user, instance.due_date)
        elif not instance.completed and instance.completed_at:
            # Task is being marked as incomplete
            instance.mark_incomplete()
        
        return instance
    
    def _update_productivity_for_date(self, user, target_date):
        """Update productivity for a specific date (uses task's due_date)"""
        
        print(f"🚀 [_update_productivity_for_date] STARTING - User: {user.id}, Date: {target_date}")
        logger.debug(f"[_update_productivity_for_date] Using target date: {target_date}")
        
        # Get all tasks due on this date
        tasks = Task.all_objects.filter(user=user, due_date=target_date, is_deleted=False)
        total_tasks = tasks.count()
        
        # Count completed tasks, but ONLY if completed on or before the due date
        # Late completions (after due date) don't count toward productivity
        completed_on_time = 0
        for task in tasks:
            if task.completed:
                # Check if task was completed on time
                if task.completed_at:
                    completion_date = task.completed_at.date()
                    if completion_date <= target_date:
                        completed_on_time += 1
                        print(f"  ✅ '{task.title}' - Completed on time ({completion_date})")
                    else:
                        print(f"  ⏰ '{task.title}' - Completed LATE ({completion_date} > {target_date}) - NOT COUNTED")
                else:
                    # No completion timestamp recorded, assume completed on time (legacy data)
                    completed_on_time += 1
                    print(f"  ✅ '{task.title}' - No completion date, assuming on time")
        
        completed_tasks = completed_on_time
        
        print(f"📊 [_update_productivity_for_date] TASK STATS for {target_date} - Total: {total_tasks}, Completed: {completed_tasks}")
        logger.debug(f"[_update_productivity_for_date] Total tasks: {total_tasks}, Completed: {completed_tasks}")
        
        # Log all tasks for debugging
        print(f"📋 [_update_productivity_for_date] TASK LIST for {target_date}:")
        for task in tasks:
            print(f"  - {task.title}: {'✅' if task.completed else '❌'} (ID: {task.id}, Due: {task.due_date})")
            logger.debug(f"[_update_productivity_for_date] Task: {task.title}, Completed: {task.completed}")
        
        if total_tasks == 0:
            completion_rate = 0
            status = 'No Tasks'
            print(f"⚠️ [_update_productivity_for_date] NO TASKS FOUND for date: {target_date}")
        else:
            completion_rate = completed_tasks / total_tasks * 100
            print(f"📈 [_update_productivity_for_date] COMPLETION RATE: {completion_rate:.1f}%")
            logger.debug(f"[_update_productivity_for_date] Completion rate: {completion_rate}%")
            
            if completion_rate >= 90:
                status = 'Highly Productive'
            elif completion_rate >= 70:
                status = 'Productive'
            elif completion_rate >= 40:
                status = 'Moderately Productive'
            else:
                status = 'Low Productive'
        
        print(f"🏆 [_update_productivity_for_date] FINAL STATUS: {status}")
        logger.debug(f"[_update_productivity_for_date] Final status: {status}")
        
        # Update or create productivity log for the target date
        print(f"💾 [_update_productivity_for_date] CREATING/UPDATING PRODUCTIVITY LOG for {target_date}...")
        log, created = ProductivityLog.objects.get_or_create(
            user=user,
            period_type='daily',
            period_start=target_date,
            period_end=target_date,
            defaults={
                'completion_rate': completion_rate,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'status': status
            }
        )
        
        # Always update the log to reflect current state
        if not created:
            print(f"🔄 [_update_productivity_for_date] UPDATING existing log (ID: {log.id})")
            log.completion_rate = completion_rate
            log.total_tasks = total_tasks
            log.completed_tasks = completed_tasks
            log.status = status
            log.save()
            print(f"✅ [_update_productivity_for_date] UPDATED log: {completion_rate:.1f}%")
            logger.debug(f"[_update_productivity_for_date] Updated existing log")
        else:
            print(f"🆕 [_update_productivity_for_date] CREATED new log (ID: {log.id}): {completion_rate:.1f}%")
            logger.debug(f"[_update_productivity_for_date] Created new log")
        
        print(f"🎯 [_update_productivity_for_date] FINAL LOG: ID={log.id}, Date={target_date}, Rate={log.completion_rate:.1f}%, Status={log.status}")
        print(f"🔄 [_update_productivity_for_date] Supabase sync should be triggered...")

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
        
        try:
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
        except Exception as e:
            logger.error(f"Error uploading evidence for task {task.id}: {e}")
            return Response({
                'error': 'Failed to upload evidence. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get task statistics for the current user"""
        user = request.user
        
        # Get query parameters for filtering
        completed = request.query_params.get('completed', None)
        priority = request.query_params.get('priority', None)
        search = request.query_params.get('search', None)
        task_category = request.query_params.get('task_category', None)
        
        # Build base queryset
        queryset = Task.objects.filter(user=user)
        
        # Apply filters (same logic as get_queryset)
        if completed is not None:
            completed_bool = completed.lower() == 'true'
            queryset = queryset.filter(completed=completed_bool)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) | 
                models.Q(description__icontains=search)
            )
        
        if task_category:
            queryset = queryset.filter(task_category__icontains=task_category)
        
        # Get counts based on filtered queryset
        total_tasks = queryset.count()
        completed_tasks = queryset.filter(completed=True).count()
        pending_tasks = total_tasks - completed_tasks
        
        # Get tasks due today (only from filtered results)
        from datetime import date
        today = date.today()
        due_today = queryset.filter(due_date=today, completed=False).count()
        
        return Response({
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'due_today': due_today
        })

    def _get_missing_requirements(self, task):
        """Get list of missing requirements for task completion"""
        missing = []
        
        # Temporarily disabled until migration is applied
        # TODO: Re-enable evidence requirement after migration is applied
        
        # # Check evidence
        # has_evidence = (
        #     task.evidence_uploaded and 
        #     (task.evidence_file or (task.evidence_description and len(task.evidence_description.strip()) > 20))
        # )
        # 
        # if not has_evidence:
        #     missing.append('Evidence of work (upload file or provide detailed description)')
        
        return missing


class SubtaskViewSet(viewsets.ModelViewSet):
    serializer_class = SubtaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for subtasks

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