#!/usr/bin/env python3
"""
Supabase sync functions for events/schedule
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

def sync_event_to_supabase(event):
    """
    Sync a Django event to Supabase
    
    Args:
        event: Django Event instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(event.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync event '{event.title}' - user '{event.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': event.id,
            'user_id': supabase_user_id,
            'title': event.title,
            'description': event.description or '',
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat(),
            'created_at': event.created_at.isoformat(),
            'updated_at': event.updated_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/events",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced event to Supabase: {event.title} (ID: {event.id})")
            return True
        else:
            print(f"❌ Failed to sync event '{event.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing event '{event.title}' to Supabase: {e}")
        return False

def update_event_in_supabase(event):
    """
    Update an existing event in Supabase
    
    Args:
        event: Django Event instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(event.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update event '{event.title}' - user '{event.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'user_id': supabase_user_id,
            'title': event.title,
            'description': event.description or '',
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat(),
            'updated_at': event.updated_at.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/events?id=eq.{event.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated event in Supabase: {event.title} (ID: {event.id})")
            return True
        else:
            print(f"❌ Failed to update event '{event.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating event '{event.title}' in Supabase: {e}")
        return False
