from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .supabase_sync import sync_deck_to_supabase, update_deck_in_supabase, sync_flashcard_to_supabase, update_flashcard_in_supabase, sync_quiz_session_to_supabase, update_quiz_session_in_supabase

class Deck(models.Model):
    title = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deck_decks')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subdecks')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    progress = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['title', 'user', 'parent']
        ordering = ['title']

    def __str__(self):
        return f"{self.title} ({self.user.username})"

    @property
    def flashcard_count(self):
        return self.flashcards.count()

class Flashcard(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='flashcards')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deck_flashcards')
    front = models.TextField()
    back = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.front[:30]}... ({self.deck.title})"

class QuizSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_sessions')
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='quiz_sessions')
    score = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-completed_at']

    def __str__(self):
        return f"QuizSession: {self.user.username} - {self.deck.title} ({self.completed_at})"


# =============================================
# DJANGO SIGNALS FOR REAL-TIME SYNC
# =============================================

@receiver(post_save, sender=Deck)
def sync_deck_on_save(sender, instance, created, **kwargs):
    """Sync deck to Supabase when created or updated"""
    try:
        if created:
            sync_deck_to_supabase(instance)
        else:
            update_deck_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in deck sync signal: {e}")

@receiver(post_save, sender=Flashcard)
def sync_flashcard_on_save(sender, instance, created, **kwargs):
    """Sync flashcard to Supabase when created or updated"""
    try:
        if created:
            sync_flashcard_to_supabase(instance)
        else:
            update_flashcard_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in flashcard sync signal: {e}")

@receiver(post_save, sender=QuizSession)
def sync_quiz_session_on_save(sender, instance, created, **kwargs):
    """Sync quiz session to Supabase when created or updated"""
    try:
        if created:
            sync_quiz_session_to_supabase(instance)
        else:
            update_quiz_session_in_supabase(instance)
    except Exception as e:
        print(f"❌ Error in quiz session sync signal: {e}")

@receiver(post_delete, sender=Deck)
def delete_deck_from_supabase(sender, instance, **kwargs):
    """Delete deck from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/decks?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted deck from Supabase: {instance.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete deck from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting deck from Supabase: {e}")

@receiver(post_delete, sender=Flashcard)
def delete_flashcard_from_supabase(sender, instance, **kwargs):
    """Delete flashcard from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/flashcards?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted flashcard from Supabase: {instance.front[:30]}... (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete flashcard from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting flashcard from Supabase: {e}")

@receiver(post_delete, sender=QuizSession)
def delete_quiz_session_from_supabase(sender, instance, **kwargs):
    """Delete quiz session from Supabase when deleted from Django"""
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
            f"{SUPABASE_URL}/rest/v1/quiz_sessions?id=eq.{instance.id}",
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"✅ Deleted quiz session from Supabase: {instance.user.username} - {instance.deck.title} (ID: {instance.id})")
        else:
            print(f"❌ Failed to delete quiz session from Supabase: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting quiz session from Supabase: {e}")