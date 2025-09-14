#!/usr/bin/env python3
"""
Supabase sync functions for productivity scale history
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

def sync_productivity_scale_history_to_supabase(history):
    """
    Sync a Django ProductivityScaleHistory to Supabase
    
    Args:
        history: Django ProductivityScaleHistory instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(history.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync productivity history - user '{history.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': history.id,
            'user_id': supabase_user_id,
            'period_type': history.period_type,
            'period_start': history.period_start.isoformat(),
            'period_end': history.period_end.isoformat(),
            'completion_rate': float(history.completion_rate),
            'total_tasks': history.total_tasks,
            'completed_tasks': history.completed_tasks,
            'status': history.status,
            'created_at': history.created_at.isoformat(),
            'updated_at': history.updated_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/productivity_scale_history",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced productivity history to Supabase: {history.user.username} - {history.period_type} (ID: {history.id})")
            return True
        else:
            print(f"❌ Failed to sync productivity history to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing productivity history to Supabase: {e}")
        return False

def update_productivity_scale_history_in_supabase(history):
    """
    Update an existing ProductivityScaleHistory in Supabase
    
    Args:
        history: Django ProductivityScaleHistory instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(history.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update productivity history - user '{history.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'user_id': supabase_user_id,
            'period_type': history.period_type,
            'period_start': history.period_start.isoformat(),
            'period_end': history.period_end.isoformat(),
            'completion_rate': float(history.completion_rate),
            'total_tasks': history.total_tasks,
            'completed_tasks': history.completed_tasks,
            'status': history.status,
            'updated_at': history.updated_at.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/productivity_scale_history?id=eq.{history.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated productivity history in Supabase: {history.user.username} - {history.period_type} (ID: {history.id})")
            return True
        else:
            print(f"❌ Failed to update productivity history in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating productivity history in Supabase: {e}")
        return False
