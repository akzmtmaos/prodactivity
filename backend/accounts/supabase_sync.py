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
    Sync a Django user and profile to Supabase (upsert - create or update)
    
    Args:
        user: Django User instance
        profile: Django Profile instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Check if user already exists in Supabase
        user_exists = check_user_exists_in_supabase(user.id)
        
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
            'updated_at': datetime.now().isoformat()
        }
        
        if not user_exists:
            # Insert new user
            data['created_at'] = user.date_joined.isoformat()
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=get_supabase_headers(),
                json=data
            )
            
            if response.status_code == 201:
                print(f"✅ Synced new user {user.username} (ID: {user.id}) to Supabase")
                return True
            else:
                print(f"❌ Failed to sync new user {user.username} to Supabase: {response.status_code} - {response.text}")
                # Try update if insert failed (might be a race condition)
                if response.status_code == 409:  # Conflict - user might exist
                    return update_user_in_supabase(user, profile)
                return False
        else:
            # Update existing user
            return update_user_in_supabase(user, profile)
            
    except Exception as e:
        print(f"❌ Error syncing user {user.username} to Supabase: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
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
            json=data,
            timeout=10
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated user {user.username} (ID: {user.id}) in Supabase")
            return True
        else:
            print(f"❌ Failed to update user {user.username} in Supabase: {response.status_code} - {response.text}")
            # Try to insert if update failed (user might not exist)
            if response.status_code == 404:
                print(f"⚠️  User {user.username} not found in Supabase, attempting insert...")
                data['id'] = user.id
                data['created_at'] = user.date_joined.isoformat()
                insert_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/profiles",
                    headers=get_supabase_headers(),
                    json=data,
                    timeout=10
                )
                if insert_response.status_code == 201:
                    print(f"✅ Inserted user {user.username} (ID: {user.id}) into Supabase")
                    return True
                else:
                    print(f"❌ Failed to insert user {user.username} to Supabase: {insert_response.status_code} - {insert_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating user {user.username} in Supabase: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
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
        # Try exact match first
        email_lower = email.lower().strip()
        email_encoded = requests.utils.quote(email_lower, safe='')
        
        print(f"🔍 Querying Supabase for email: {email_lower}")
        print(f"🔍 Encoded email: {email_encoded}")
        print(f"🔍 Supabase URL: {SUPABASE_URL}")
        
        # Try exact match
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{email_encoded}",
            headers=get_supabase_headers(),
            timeout=10
        )
        
        print(f"📡 Supabase response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📦 Supabase response data: {data}")
            if len(data) > 0:
                print(f"✅ Found user in Supabase: {data[0]}")
                return data[0]
            else:
                print(f"⚠️ No user found with exact email match")
                # Try case-insensitive search by getting all profiles and filtering
                print(f"🔍 Trying to get all profiles to search...")
                all_profiles_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?select=*&limit=1000",
                    headers=get_supabase_headers(),
                    timeout=10
                )
                if all_profiles_response.status_code == 200:
                    all_profiles = all_profiles_response.json()
                    print(f"📦 Found {len(all_profiles)} total profiles in Supabase")
                    # Search for email (case-insensitive)
                    for profile in all_profiles:
                        if profile.get('email', '').lower() == email_lower:
                            print(f"✅ Found user in Supabase (case-insensitive): {profile}")
                            return profile
                    print(f"⚠️ No user found with email (case-insensitive): {email_lower}")
                    # Log sample emails for debugging
                    if all_profiles:
                        sample_emails = [p.get('email', 'N/A') for p in all_profiles[:5]]
                        print(f"📋 Sample emails in Supabase: {sample_emails}")
        else:
            print(f"❌ Failed to get user from Supabase: {response.status_code}")
            print(f"❌ Response text: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting user from Supabase: {e}")
        import traceback
        print(traceback.format_exc())
        return None

def get_user_from_supabase_by_username(username):
    """
    Get user data from Supabase by username
    
    Args:
        username: User username
    
    Returns:
        dict: User data from Supabase, or None if not found
    """
    try:
        username_lower = username.lower().strip()
        username_encoded = requests.utils.quote(username_lower, safe='')

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?username=eq.{username_encoded}",
            headers=get_supabase_headers(),
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                return data[0]
        else:
            print(f"❌ Failed to get user from Supabase by username: {response.status_code}")
            print(f"❌ Response text: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Error getting user from Supabase by username: {e}")
        import traceback
        print(traceback.format_exc())
        return None

def get_all_supabase_profiles(limit: int = 1000):
    """
    Fetch all profiles from Supabase REST API.
    Returns a list of dicts.
    """
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?select=*&limit={limit}",
            headers=get_supabase_headers(),
            timeout=30,
        )
        if response.status_code == 200:
            return response.json()
        print(f"❌ Failed to list Supabase profiles: {response.status_code} - {response.text}")
        return []
    except Exception as e:
        print(f"❌ Error listing Supabase profiles: {e}")
        return []