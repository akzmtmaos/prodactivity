# notes/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True) 
    
    class Meta:
        verbose_name_plural = "Categories"
        unique_together = ['name', 'user']  # Prevent duplicate category names per user
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @property
    def notes_count(self):
        return self.notes.filter(is_deleted=False).count()

class Note(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_visited = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']  # Most recent first
    
    def __str__(self):
        return f"{self.title} - {self.category.name}"
    
    @property
    def category_name(self):
        return self.category.name