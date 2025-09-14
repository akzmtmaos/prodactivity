# notes/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .supabase_sync import sync_notebook_to_supabase, update_notebook_in_supabase, sync_note_to_supabase, update_note_in_supabase

class Notebook(models.Model):
    NOTEBOOK_TYPE_CHOICES = [
        ('study', 'Study Notes'),
        ('meeting', 'Meeting Notes'),
        ('personal', 'Personal Notes'),
        ('work', 'Work Notes'),
        ('project', 'Project Notes'),
        ('research', 'Research Notes'),
        ('other', 'Other'),
    ]
    
    URGENCY_CHOICES = [
        ('normal', 'Normal'),
        ('important', 'Important'),
        ('urgent', 'Urgent'),
        ('critical', 'Critical'),
    ]
    
    name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notebooks')
    notebook_type = models.CharField(max_length=20, choices=NOTEBOOK_TYPE_CHOICES, default='other')
    urgency_level = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='normal')
    description = models.TextField(blank=True, help_text="Brief description of the notebook's purpose")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name_plural = "Notebooks"
        unique_together = ['name', 'user']  # Prevent duplicate notebook names per user
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @property
    def notes_count(self):
        return self.notes.filter(is_deleted=False, is_archived=False).count()

class Note(models.Model):
    NOTE_TYPE_CHOICES = [
        ('lecture', 'Lecture Notes'),
        ('reading', 'Reading Notes'),
        ('assignment', 'Assignment Notes'),
        ('exam', 'Exam Notes'),
        ('meeting', 'Meeting Notes'),
        ('personal', 'Personal Notes'),
        ('work', 'Work Notes'),
        ('project', 'Project Notes'),
        ('research', 'Research Notes'),
        ('other', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    is_urgent = models.BooleanField(default=False, help_text="Mark as urgent for immediate attention")
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags for easy categorization")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    last_visited = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.title} ({self.user.username})"


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=Notebook)
def sync_notebook_on_save(sender, instance, created, **kwargs):
    """Sync notebook to Supabase when created or updated"""
    try:
        if created:
            sync_notebook_to_supabase(instance)
        else:
            update_notebook_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in notebook sync signal: {e}")

@receiver(post_save, sender=Note)
def sync_note_on_save(sender, instance, created, **kwargs):
    """Sync note to Supabase when created or updated"""
    try:
        if created:
            sync_note_to_supabase(instance)
        else:
            update_note_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in note sync signal: {e}")

@receiver(post_delete, sender=Notebook)
def delete_notebook_from_supabase(sender, instance, **kwargs):
    """Delete notebook from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/notebooks?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted notebook from Supabase: {instance.name} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete notebook from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting notebook from Supabase: {e}")

@receiver(post_delete, sender=Note)
def delete_note_from_supabase(sender, instance, **kwargs):
    """Delete note from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/notes?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted note from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete note from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting note from Supabase: {e}")