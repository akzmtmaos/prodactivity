# This file contains models for core app, including TermsAndConditions for CMS management via admin.
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .supabase_sync import sync_notification_to_supabase, update_notification_in_supabase, sync_terms_and_conditions_to_supabase, update_terms_and_conditions_in_supabase, sync_ai_configuration_to_supabase, update_ai_configuration_in_supabase

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
        ('schedule_reminder', 'Schedule Reminder'),
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
        ('flashcard_prompt', 'Flashcard Generation Prompt'),
        ('flashcard_qa_prompt', 'Q&A Pattern Flashcard Prompt'),
        ('flashcard_heading_prompt', 'Heading Pattern Flashcard Prompt'),
        ('smart_chunking_prompt', 'Smart Chunking Analysis Prompt'),
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


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=Notification)
def sync_notification_on_save(sender, instance, created, **kwargs):
    """Sync notification to Supabase when created or updated, and send email notification"""
    try:
        if created:
            sync_notification_to_supabase(instance)
            # Send email notification
            try:
                from .email_utils import send_notification_email
                send_notification_email(instance)
            except Exception as e:
                print(f"⚠️  Error sending notification email: {e}")
        else:
            update_notification_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in notification sync signal: {e}")

@receiver(post_save, sender=TermsAndConditions)
def sync_terms_and_conditions_on_save(sender, instance, created, **kwargs):
    """Sync terms and conditions to Supabase when created or updated"""
    try:
        if created:
            sync_terms_and_conditions_to_supabase(instance)
        else:
            update_terms_and_conditions_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in terms and conditions sync signal: {e}")

@receiver(post_save, sender=AIConfiguration)
def sync_ai_configuration_on_save(sender, instance, created, **kwargs):
    """Sync AI configuration to Supabase when created or updated"""
    try:
        if created:
            sync_ai_configuration_to_supabase(instance)
        else:
            update_ai_configuration_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in AI configuration sync signal: {e}")

@receiver(post_delete, sender=Notification)
def delete_notification_from_supabase(sender, instance, **kwargs):
    """Delete notification from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/notifications?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted notification from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete notification from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting notification from Supabase: {e}")

@receiver(post_delete, sender=TermsAndConditions)
def delete_terms_and_conditions_from_supabase(sender, instance, **kwargs):
    """Delete terms and conditions from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/terms_and_conditions?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted terms and conditions from Supabase (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete terms and conditions from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting terms and conditions from Supabase: {e}")

@receiver(post_delete, sender=AIConfiguration)
def delete_ai_configuration_from_supabase(sender, instance, **kwargs):
    """Delete AI configuration from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/ai_configurations?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted AI configuration from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete AI configuration from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting AI configuration from Supabase: {e}") 