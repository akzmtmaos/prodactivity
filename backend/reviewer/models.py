from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from notes.models import Note, Notebook

class Reviewer(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    source_note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='reviewers', null=True, blank=True)
    source_notebook = models.ForeignKey(Notebook, on_delete=models.CASCADE, related_name='reviewers', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviewers')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_favorite = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"
