"""
Supabase synchronization utilities for Django accounts
"""

import requests
import os
from django.conf import settings
from datetime import datetime

# Supabase configuration
SUPABASE_URL = getattr(settings, 'SUPABASE_URL', 'https://tyuiugbvqmeatyjpenzg.supabase.co')
SUPABASE_ANON_KEY = getattr(settings, 'SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWl1Z2J2cW1lYXR5anBlbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTQ1MjcsImV4cCI6MjA3Mjg3MDUyN30.Kb8tj1jaBIm8XxLQuaVQr-8I-v4JhrPjKAD_jv_yp30')

def get_supabase_headers():
    """Get headers for Supabase API requests"""
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

def sync_user_to_supabase(user, profile):
    """
    Sync a Django user and profile to Supabase
    
    Args:
        user: Django User instance
        profile: Django Profile instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Handle avatar path length limitation
        avatar = None
        if profile.avatar:
            avatar_url = profile.avatar.url
            # Truncate avatar path if it's too long (Supabase limit is 100 chars)
            if len(avatar_url) > 100:
                avatar = avatar_url.split('/')[-1]  # Keep only filename
                print(f"⚠️  Truncated avatar path from {len(avatar_url)} to {len(avatar)} characters for user {user.username}")
            else:
                avatar = avatar_url
        
        # Prepare data for Supabase
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar': avatar,
            'email_verified': profile.email_verified,
            'email_verified_at': profile.email_verified_at.isoformat() if profile.email_verified_at else None,
            'created_at': user.date_joined.isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced user {user.username} to Supabase")
            return True
        else:
            print(f"❌ Failed to sync user {user.username} to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing user {user.username} to Supabase: {e}")
        return False

def update_user_in_supabase(user, profile):
    """
    Update an existing user in Supabase
    
    Args:
        user: Django User instance
        profile: Django Profile instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Handle avatar path length limitation
        avatar = None
        if profile.avatar:
            avatar_url = profile.avatar.url
            # Truncate avatar path if it's too long (Supabase limit is 100 chars)
            if len(avatar_url) > 100:
                avatar = avatar_url.split('/')[-1]  # Keep only filename
                print(f"⚠️  Truncated avatar path from {len(avatar_url)} to {len(avatar)} characters for user {user.username}")
            else:
                avatar = avatar_url
        
        # Prepare data for Supabase
        data = {
            'username': user.username,
            'email': user.email,
            'avatar': avatar,
            'email_verified': profile.email_verified,
            'email_verified_at': profile.email_verified_at.isoformat() if profile.email_verified_at else None,
            'updated_at': datetime.now().isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200:
            print(f"✅ Updated user {user.username} in Supabase")
            return True
        else:
            print(f"❌ Failed to update user {user.username} in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating user {user.username} in Supabase: {e}")
        return False

def check_user_exists_in_supabase(user_id):
    """
    Check if a user exists in Supabase
    
    Args:
        user_id: Django user ID
    
    Returns:
        bool: True if exists, False otherwise
    """
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers=get_supabase_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            return len(data) > 0
        else:
            print(f"❌ Failed to check user existence in Supabase: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking user existence in Supabase: {e}")
        return False

def get_user_from_supabase_by_email(email):
    """
    Get user data from Supabase by email
    
    Args:
        email: User email address
    
    Returns:
        dict: User data from Supabase, or None if not found
    """
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{email}",
            headers=get_supabase_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                return data[0]
        else:
            print(f"❌ Failed to get user from Supabase: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting user from Supabase: {e}")
        return None