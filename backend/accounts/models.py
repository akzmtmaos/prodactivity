from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .supabase_sync import sync_user_to_supabase, update_user_in_supabase, check_user_exists_in_supabase

# Create your models here.

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        profile = Profile.objects.create(user=instance)
        # Sync to Supabase
        try:
            sync_user_to_supabase(instance, profile)
        except Exception as e:
            print(f"⚠️  Failed to sync new user {instance.username} to Supabase: {e}")

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
        # Update in Supabase if user exists there
        if check_user_exists_in_supabase(instance.id):
            update_user_in_supabase(instance, instance.profile)
    except Profile.DoesNotExist:
        # Profile doesn't exist yet, it will be created by the create_user_profile signal
        pass
    except Exception as e:
        print(f"⚠️  Failed to update user {instance.username} in Supabase: {e}")

@receiver(post_save, sender=Profile)
def sync_profile_to_supabase(sender, instance, created, **kwargs):
    """Sync profile changes to Supabase"""
    try:
        if check_user_exists_in_supabase(instance.user.id):
            update_user_in_supabase(instance.user, instance)
    except Exception as e:
        print(f"⚠️  Failed to sync profile changes for {instance.user.username} to Supabase: {e}")
