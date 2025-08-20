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
        ('task_due', 'Task Due'),
        ('task_completed', 'Task Completed'),
        ('note_reminder', 'Note Reminder'),
        ('study_reminder', 'Study Reminder'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='general')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"

class AIConfiguration(models.Model):
    """Configuration model for AI prompts and settings that can be managed through Django Admin."""
    
    CONFIG_TYPES = [
        ('reviewer_prompt', 'Reviewer Generation Prompt'),
        ('quiz_prompt', 'Quiz Generation Prompt'),
        ('summary_prompt', 'Content Summary Prompt'),
        ('chat_prompt', 'AI Chat Prompt'),
    ]
    
    config_type = models.CharField(
        max_length=50, 
        choices=CONFIG_TYPES, 
        unique=True,
        verbose_name="Configuration Type",
        help_text="The type of AI configuration"
    )
    
    title = models.CharField(
        max_length=200,
        verbose_name="Configuration Title",
        help_text="A descriptive title for this configuration"
    )
    
    prompt_template = models.TextField(
        verbose_name="Prompt Template",
        help_text="The prompt template with placeholders like {content}, {text}, etc."
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Whether this configuration is currently active"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Description",
        help_text="Optional description of what this configuration does"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['config_type']
        verbose_name = "AI Configuration"
        verbose_name_plural = "AI Configurations"
    
    def __str__(self):
        return f"{self.title} ({self.get_config_type_display()})"
    
    def get_prompt(self, **kwargs):
        """Get the formatted prompt with the given parameters."""
        try:
            return self.prompt_template.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing required parameter in prompt template: {e}") 