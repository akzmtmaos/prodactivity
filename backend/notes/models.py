# notes/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Notebook(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notebooks')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True) 
    
    class Meta:
        verbose_name_plural = "Notebooks"
        unique_together = ['name', 'user']  # Prevent duplicate notebook names per user
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @property
    def notes_count(self):
        return self.notes.filter(is_deleted=False).count()

class Note(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_visited = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']  # Most recent first
    
    def __str__(self):
        return f"{self.title} - {self.notebook.name}"
    
    @property
    def notebook_name(self):
        return self.notebook.name