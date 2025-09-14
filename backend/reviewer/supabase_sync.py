#!/usr/bin/env python3
"""
Supabase sync functions for reviewers
"""

import requests
from datetime import datetime
from django.conf import settings

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

def get_user_supabase_id(django_user):
    """Get Supabase user ID for a Django user"""
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles?username=eq.{django_user.username}&select=id",
            headers=get_supabase_headers()
        )
        
        if response.status_code == 200:
            profiles = response.json()
            if profiles:
                return profiles[0]['id']
        return None
    except Exception as e:
        print(f"❌ Error getting Supabase user ID for {django_user.username}: {e}")
        return None

def sync_reviewer_to_supabase(reviewer):
    """
    Sync a Django reviewer to Supabase
    
    Args:
        reviewer: Django Reviewer instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(reviewer.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync reviewer '{reviewer.title}' - user '{reviewer.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': reviewer.id,
            'title': reviewer.title,
            'content': reviewer.content,
            'source_note_id': reviewer.source_note.id if reviewer.source_note else None,
            'source_notebook_id': reviewer.source_notebook.id if reviewer.source_notebook else None,
            'user_id': supabase_user_id,
            'created_at': reviewer.created_at.isoformat(),
            'updated_at': reviewer.updated_at.isoformat(),
            'is_favorite': reviewer.is_favorite,
            'tags': reviewer.tags,
            'is_deleted': reviewer.is_deleted,
            'deleted_at': reviewer.deleted_at.isoformat() if reviewer.deleted_at else None
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/reviewers",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced reviewer to Supabase: {reviewer.title} (ID: {reviewer.id})")
            return True
        else:
            print(f"❌ Failed to sync reviewer '{reviewer.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing reviewer '{reviewer.title}' to Supabase: {e}")
        return False

def update_reviewer_in_supabase(reviewer):
    """
    Update an existing reviewer in Supabase
    
    Args:
        reviewer: Django Reviewer instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(reviewer.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update reviewer '{reviewer.title}' - user '{reviewer.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'title': reviewer.title,
            'content': reviewer.content,
            'source_note_id': reviewer.source_note.id if reviewer.source_note else None,
            'source_notebook_id': reviewer.source_notebook.id if reviewer.source_notebook else None,
            'user_id': supabase_user_id,
            'updated_at': reviewer.updated_at.isoformat(),
            'is_favorite': reviewer.is_favorite,
            'tags': reviewer.tags,
            'is_deleted': reviewer.is_deleted,
            'deleted_at': reviewer.deleted_at.isoformat() if reviewer.deleted_at else None
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/reviewers?id=eq.{reviewer.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated reviewer in Supabase: {reviewer.title} (ID: {reviewer.id})")
            return True
        else:
            print(f"❌ Failed to update reviewer '{reviewer.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating reviewer '{reviewer.title}' in Supabase: {e}")
        return False
