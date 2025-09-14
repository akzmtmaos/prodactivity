from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .supabase_sync import sync_productivity_scale_history_to_supabase, update_productivity_scale_history_in_supabase

# Create your models here.

class ProductivityScaleHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    period_type = models.CharField(max_length=10)
    period_start = models.DateField()
    period_end = models.DateField()
    completion_rate = models.FloatField(default=0.0)
    total_tasks = models.IntegerField(default=0)
    completed_tasks = models.IntegerField(default=0)
    status = models.CharField(max_length=32, default='No Tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.period_type} - {self.status}"


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=ProductivityScaleHistory)
def sync_productivity_scale_history_on_save(sender, instance, created, **kwargs):
    """Sync productivity scale history to Supabase when created or updated"""
    try:
        if created:
            sync_productivity_scale_history_to_supabase(instance)
        else:
            update_productivity_scale_history_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in productivity scale history sync signal: {e}")

@receiver(post_delete, sender=ProductivityScaleHistory)
def delete_productivity_scale_history_from_supabase(sender, instance, **kwargs):
    """Delete productivity scale history from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/productivity_scale_history?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted productivity scale history from Supabase: {instance.user.username} - {instance.period_type} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete productivity scale history from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting productivity scale history from Supabase: {e}")
