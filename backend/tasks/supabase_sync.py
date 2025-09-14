#!/usr/bin/env python3
"""
Supabase sync functions for subtasks and productivity logs
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

def sync_subtask_to_supabase(subtask):
    """
    Sync a Django subtask to Supabase
    
    Args:
        subtask: Django Subtask instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare data for Supabase
        data = {
            'id': subtask.id,
            'task_id': subtask.task.id,
            'title': subtask.title,
            'completed': subtask.completed,
            'created_at': subtask.created_at.isoformat(),
            'updated_at': subtask.updated_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/subtasks",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced subtask to Supabase: {subtask.title} (ID: {subtask.id})")
            return True
        else:
            print(f"❌ Failed to sync subtask '{subtask.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing subtask '{subtask.title}' to Supabase: {e}")
        return False

def update_subtask_in_supabase(subtask):
    """
    Update an existing subtask in Supabase
    
    Args:
        subtask: Django Subtask instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare data for Supabase
        data = {
            'task_id': subtask.task.id,
            'title': subtask.title,
            'completed': subtask.completed,
            'updated_at': subtask.updated_at.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/subtasks?id=eq.{subtask.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated subtask in Supabase: {subtask.title} (ID: {subtask.id})")
            return True
        else:
            print(f"❌ Failed to update subtask '{subtask.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating subtask '{subtask.title}' in Supabase: {e}")
        return False

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

def sync_productivity_log_to_supabase(productivity_log):
    """
    Sync a Django ProductivityLog to Supabase
    
    Args:
        productivity_log: Django ProductivityLog instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(productivity_log.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync productivity log - user '{productivity_log.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': productivity_log.id,
            'user_id': supabase_user_id,
            'period_type': productivity_log.period_type,
            'period_start': productivity_log.period_start.isoformat(),
            'period_end': productivity_log.period_end.isoformat(),
            'completion_rate': float(productivity_log.completion_rate),
            'total_tasks': productivity_log.total_tasks,
            'completed_tasks': productivity_log.completed_tasks,
            'status': productivity_log.status,
            'logged_at': productivity_log.logged_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/productivity_logs",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced productivity log to Supabase: {productivity_log.user.username} - {productivity_log.period_type} (ID: {productivity_log.id})")
            return True
        else:
            print(f"❌ Failed to sync productivity log to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing productivity log to Supabase: {e}")
        return False

def update_productivity_log_in_supabase(productivity_log):
    """
    Update an existing ProductivityLog in Supabase
    
    Args:
        productivity_log: Django ProductivityLog instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(productivity_log.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update productivity log - user '{productivity_log.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'user_id': supabase_user_id,
            'period_type': productivity_log.period_type,
            'period_start': productivity_log.period_start.isoformat(),
            'period_end': productivity_log.period_end.isoformat(),
            'completion_rate': float(productivity_log.completion_rate),
            'total_tasks': productivity_log.total_tasks,
            'completed_tasks': productivity_log.completed_tasks,
            'status': productivity_log.status,
            'logged_at': productivity_log.logged_at.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/productivity_logs?id=eq.{productivity_log.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated productivity log in Supabase: {productivity_log.user.username} - {productivity_log.period_type} (ID: {productivity_log.id})")
            return True
        else:
            print(f"❌ Failed to update productivity log in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating productivity log in Supabase: {e}")
        return False
