from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from notes.models import Note, Notebook
from .supabase_sync import sync_reviewer_to_supabase, update_reviewer_in_supabase

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
    best_score = models.IntegerField(null=True, blank=True, help_text="Best quiz score (percentage)")
    best_score_correct = models.IntegerField(null=True, blank=True, help_text="Number of correct answers in best attempt")
    best_score_total = models.IntegerField(null=True, blank=True, help_text="Total number of questions")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=Reviewer)
def sync_reviewer_on_save(sender, instance, created, **kwargs):
    """Sync reviewer to Supabase when created or updated"""
    try:
        if created:
            sync_reviewer_to_supabase(instance)
        else:
            update_reviewer_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in reviewer sync signal: {e}")

@receiver(post_delete, sender=Reviewer)
def delete_reviewer_from_supabase(sender, instance, **kwargs):
    """Delete reviewer from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/reviewers?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted reviewer from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete reviewer from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting reviewer from Supabase: {e}")
