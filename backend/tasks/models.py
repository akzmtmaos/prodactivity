from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class TaskManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    CATEGORY_CHOICES = [
        ('work', 'Work'),
        ('personal', 'Personal'),
        ('study', 'Study'),
        ('health', 'Health'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    completed = models.BooleanField(default=False)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # New fields for productivity validation
    has_activity = models.BooleanField(default=False, help_text="Whether the user has done any work on this task")
    activity_notes = models.TextField(blank=True, help_text="Notes about what work was done on this task")
    time_spent_minutes = models.IntegerField(default=0, help_text="Time spent working on this task in minutes")
    last_activity_at = models.DateTimeField(null=True, blank=True, help_text="When the user last worked on this task")
    
    # Evidence fields for task completion
    evidence_uploaded = models.BooleanField(default=False, help_text="Whether evidence has been uploaded")
    evidence_description = models.TextField(blank=True, help_text="Description of the evidence provided")
    evidence_file = models.FileField(upload_to='task_evidence/', null=True, blank=True, help_text="Evidence file (screenshot, document, etc.)")
    evidence_uploaded_at = models.DateTimeField(null=True, blank=True, help_text="When evidence was uploaded")
    
    # Soft delete fields
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    was_completed_on_delete = models.BooleanField(default=False)

    objects = TaskManager()  # Default manager filters out deleted
    all_objects = models.Manager()  # To access all tasks including deleted

    class Meta:
        ordering = ['due_date', 'priority']
        
    def __str__(self):
        return self.title 

    def can_be_completed(self):
        """Check if the task can be marked as complete based on productivity criteria"""
        # Task can be completed if:
        # 1. User has logged some activity (has_activity = True)
        # 2. AND user has provided evidence of work
        # 3. AND either spent time OR provided notes OR uploaded evidence file
        has_basic_activity = (
            self.has_activity or 
            self.time_spent_minutes >= 5 or 
            (self.activity_notes and len(self.activity_notes.strip()) > 10)
        )
        
        has_evidence = (
            self.evidence_uploaded and 
            (self.evidence_file or (self.evidence_description and len(self.evidence_description.strip()) > 20))
        )
        
        return has_basic_activity and has_evidence

    def delete(self, using=None, keep_parents=False):
        if self.completed:
            self.was_completed_on_delete = True
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    @staticmethod
    def get_weekly_productivity_status(user):
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())  # Monday
        end_of_week = start_of_week + timedelta(days=6)          # Sunday

        tasks = Task.all_objects.filter(user=user, due_date__range=(start_of_week, end_of_week), is_deleted=False)
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(completed=True).count()

        if total_tasks == 0:
            return {
                'status': 'No Tasks',
                'completion_rate': 0,
                'total_tasks': 0,
                'completed_tasks': 0
            }

        completion_rate = completed_tasks / total_tasks
        completion_pct = completion_rate * 100
        if completion_pct >= 90:
            status = 'Highly Productive'
        elif completion_pct >= 70:
            status = 'Productive'
        elif completion_pct >= 40:
            status = 'Needs Improvement'
        else:
            status = 'Low Productivity'
        return {
            'status': status,
            'completion_rate': round(completion_pct, 2),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks
        } 

class Subtask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.title} (Subtask of {self.task_id})"

class XPLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xp_logs')
    task = models.ForeignKey('Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='xp_logs')
    xp = models.IntegerField(default=10)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-awarded_at'] 

class ProductivityLog(models.Model):
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='productivity_logs')
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    completion_rate = models.FloatField()
    total_tasks = models.IntegerField()
    completed_tasks = models.IntegerField()
    status = models.CharField(max_length=32)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'period_type', 'period_start', 'period_end')
        ordering = ['-period_start'] 