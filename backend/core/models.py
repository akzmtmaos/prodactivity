# This file contains models for core app, including TermsAndConditions for CMS management via admin.
from django.db import models
from django.contrib.auth.models import User

class TermsAndConditions(models.Model):
    content = models.TextField(verbose_name="Terms and Conditions Content", help_text="The content of the Terms and Conditions shown to users.")
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Terms and Conditions (Last updated: {self.last_updated:%Y-%m-%d %H:%M})"

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("task_due", "Task Due"),
        ("task_overdue", "Task Overdue"),
        ("event_upcoming", "Event Upcoming"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    message = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # Optional relations to Task or Event
    task = models.ForeignKey('tasks.Task', null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    event = models.ForeignKey('schedule.Event', null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.message} ({self.type})" 