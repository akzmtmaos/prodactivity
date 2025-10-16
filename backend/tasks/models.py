from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .supabase_sync import sync_subtask_to_supabase, update_subtask_in_supabase, sync_productivity_log_to_supabase, update_productivity_log_in_supabase, sync_task_to_supabase, update_task_in_supabase, delete_task_from_supabase

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
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When the task was actually completed")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    task_category = models.CharField(max_length=50, blank=True, help_text="Custom task category (e.g., CAPSTONE, Math, ComProg2)")
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
        # For now, allow completion without evidence to test the system
        # TODO: Re-enable evidence requirement after migration is applied
        return True
        
        # Original logic (commented out until migration is applied):
        # has_evidence = (
        #     self.evidence_uploaded and 
        #     (self.evidence_file or (self.evidence_description and len(self.evidence_description.strip()) > 20))
        # )
        # return has_evidence

    def mark_completed(self):
        """Mark the task as completed and set the completion timestamp"""
        if not self.completed:
            self.completed = True
            self.completed_at = timezone.now()
            self.save()

    def mark_incomplete(self):
        """Mark the task as incomplete and clear the completion timestamp"""
        if self.completed:
            self.completed = False
            self.completed_at = None
            self.save()

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

        # Calculate productivity for this week by aggregating daily data
        total_tasks = 0
        completed_tasks = 0
        current_date = start_of_week
        while current_date <= end_of_week:
            daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
            daily_non_deleted = daily_tasks.filter(is_deleted=False)
            daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
            
            daily_total = daily_non_deleted.count() + daily_deleted_completed.count()
            daily_completed = daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
            
            total_tasks += daily_total
            completed_tasks += daily_completed
            current_date += timedelta(days=1)

        if total_tasks == 0:
            return {
                'status': 'No Tasks',
                'completion_rate': 0,
                'total_tasks': 0,
                'completed_tasks': 0
            }

        # Calculate completion rate based on actual task completion
        completion_rate = completed_tasks / total_tasks
        completion_pct = completion_rate * 100
        if completion_pct >= 90:
            status = 'Highly Productive'
        elif completion_pct >= 70:
            status = 'Productive'
        elif completion_pct >= 40:
            status = 'Moderately Productive'
        else:
            status = 'Low Productive'
            
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


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=Subtask)
def sync_subtask_on_save(sender, instance, created, **kwargs):
    """Sync subtask to Supabase when created or updated"""
    try:
        if created:
            sync_subtask_to_supabase(instance)
        else:
            update_subtask_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in subtask sync signal: {e}")

@receiver(post_delete, sender=Subtask)
def delete_subtask_from_supabase(sender, instance, **kwargs):
    """Delete subtask from Supabase when deleted from Django"""
    try:
        import requests
        from django.conf import settings
        
        SUPABASE_URL = getattr(settings, 'SUPABASE_URL', 'https://tyuiugbvqmeatyjpenzg.supabase.co')
        SUPABASE_ANON_KEY = getattr(settings, 'SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWl1Z2J2cW1lYXR5anBlbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTQ1MjcsImV4cCI6MjA3Mjg3MDUyN30.Kb8tj1jaBIm8XxLQuaVQr-8I-v4JhrPjKAD_jv_yp30')
        
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/subtasks?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted subtask from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete subtask from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting subtask from Supabase: {e}")

@receiver(post_save, sender=ProductivityLog)
def sync_productivity_log_on_save(sender, instance, created, **kwargs):
    """Sync productivity log to Supabase when created or updated"""
    try:
        if created:
            sync_productivity_log_to_supabase(instance)
        else:
            update_productivity_log_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in productivity log sync signal: {e}")

@receiver(post_delete, sender=ProductivityLog)
def delete_productivity_log_from_supabase(sender, instance, **kwargs):
    """Delete productivity log from Supabase when deleted from Django"""
    try:
        import requests
        from django.conf import settings
        
        SUPABASE_URL = getattr(settings, 'SUPABASE_URL', 'https://tyuiugbvqmeatyjpenzg.supabase.co')
        SUPABASE_ANON_KEY = getattr(settings, 'SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWl1Z2J2cW1lYXR5anBlbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTQ1MjcsImV4cCI6MjA3Mjg3MDUyN30.Kb8tj1jaBIm8XxLQuaVQr-8I-v4JhrPjKAD_jv_yp30')
        
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/productivity_logs?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted productivity log from Supabase: {instance.period_type} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete productivity log from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting productivity log from Supabase: {e}")

@receiver(post_save, sender=Task)
def sync_task_on_save(sender, instance, created, **kwargs):
    """Sync task to Supabase when created or updated"""
    try:
        if created:
            sync_task_to_supabase(instance)
        else:
            update_task_in_supabase(instance)
    except Exception as e:
        print(f"Error in task sync signal: {e}")

@receiver(post_delete, sender=Task)
def delete_task_from_supabase_signal(sender, instance, **kwargs):
    """Delete task from Supabase when deleted from Django"""
    try:
        delete_task_from_supabase(instance)
    except Exception as e:
        print(f"Error deleting task from Supabase: {e}") 