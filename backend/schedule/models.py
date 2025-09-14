from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .supabase_sync import sync_event_to_supabase, update_event_in_supabase

# Create your models here.

class Event(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f"{self.title} ({self.start_time} - {self.end_time})"


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=Event)
def sync_event_on_save(sender, instance, created, **kwargs):
    """Sync event to Supabase when created or updated"""
    try:
        if created:
            sync_event_to_supabase(instance)
        else:
            update_event_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in event sync signal: {e}")

@receiver(post_delete, sender=Event)
def delete_event_from_supabase(sender, instance, **kwargs):
    """Delete event from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/events?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted event from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete event from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting event from Supabase: {e}")
