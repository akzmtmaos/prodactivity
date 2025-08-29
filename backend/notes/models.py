# notes/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

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