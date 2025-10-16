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

def sync_task_to_supabase(task):
    """
    Sync a Django task to Supabase
    
    Args:
        task: Django Task instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[sync_task_to_supabase] STARTING - Task: {task.title} (ID: {task.id})")
        
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(task.user)
        if not supabase_user_id:
            print(f"Cannot sync task - user '{task.user.username}' not found in Supabase")
            return False
        
        print(f"[sync_task_to_supabase] Found Supabase user ID: {supabase_user_id}")
        
        # Prepare data for Supabase
        data = {
            'id': task.id,
            'user_id': supabase_user_id,
            'title': task.title,
            'description': task.description or '',
            'due_date': task.due_date.isoformat() if hasattr(task.due_date, 'isoformat') else str(task.due_date),
            'priority': task.priority,
            'task_category': task.task_category,
            'completed': task.completed,
            'completed_at': task.completed_at.isoformat() if task.completed_at and hasattr(task.completed_at, 'isoformat') else (str(task.completed_at) if task.completed_at else None),
            'time_spent_minutes': task.time_spent_minutes or 0,
            'is_deleted': task.is_deleted,
            'created_at': task.created_at.isoformat() if hasattr(task.created_at, 'isoformat') else str(task.created_at),
            'updated_at': task.updated_at.isoformat() if hasattr(task.updated_at, 'isoformat') else str(task.updated_at)
        }
        
        print(f"[sync_task_to_supabase] Sending data to Supabase: {data}")
        
        # Try to insert first, if it fails due to duplicate key, update instead
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/tasks",
            headers=get_supabase_headers(),
            json=data
        )
        
        print(f"[sync_task_to_supabase] Supabase response: {response.status_code}")
        
        if response.status_code == 201:
            print(f"[sync_task_to_supabase] SUCCESS - Synced task: {task.title} (ID: {task.id})")
            return True
        elif response.status_code == 409:  # Duplicate key error
            print(f"[sync_task_to_supabase] Task already exists, updating instead...")
            # Remove 'id' from data for update
            update_data = {k: v for k, v in data.items() if k != 'id'}
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task.id}",
                headers=get_supabase_headers(),
                json=update_data
            )
            if update_response.status_code in [200, 204]:
                print(f"[sync_task_to_supabase] SUCCESS - Updated existing task: {task.title} (ID: {task.id})")
                return True
            else:
                print(f"[sync_task_to_supabase] FAILED to update - Status: {update_response.status_code}, Response: {update_response.text}")
                return False
        else:
            print(f"[sync_task_to_supabase] FAILED - Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error syncing task '{task.title}' to Supabase: {e}")
        return False

def update_task_in_supabase(task):
    """
    Update an existing task in Supabase
    
    Args:
        task: Django Task instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[update_task_in_supabase] STARTING - Task: {task.title} (ID: {task.id})")
        
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(task.user)
        if not supabase_user_id:
            print(f"Cannot update task - user '{task.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'user_id': supabase_user_id,
            'title': task.title,
            'description': task.description or '',
            'due_date': task.due_date.isoformat() if hasattr(task.due_date, 'isoformat') else str(task.due_date),
            'priority': task.priority,
            'task_category': task.task_category,
            'completed': task.completed,
            'completed_at': task.completed_at.isoformat() if task.completed_at and hasattr(task.completed_at, 'isoformat') else (str(task.completed_at) if task.completed_at else None),
            'time_spent_minutes': task.time_spent_minutes or 0,
            'is_deleted': task.is_deleted,
            'updated_at': task.updated_at.isoformat() if hasattr(task.updated_at, 'isoformat') else str(task.updated_at)
        }
        
        print(f"[update_task_in_supabase] Sending data to Supabase: {data}")
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        print(f"[update_task_in_supabase] Supabase response: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"[update_task_in_supabase] SUCCESS - Updated task: {task.title} (ID: {task.id})")
            return True
        else:
            print(f"[update_task_in_supabase] FAILED - Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error updating task '{task.title}' in Supabase: {e}")
        return False

def delete_task_from_supabase(task):
    """
    Delete a task from Supabase (soft delete by setting is_deleted=True)
    
    Args:
        task: Django Task instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[delete_task_from_supabase] STARTING - Task: {task.title} (ID: {task.id})")
        
        # Soft delete by setting is_deleted=True
        data = {
            'is_deleted': True,
            'updated_at': task.updated_at.isoformat() if hasattr(task.updated_at, 'isoformat') else str(task.updated_at)
        }
        
        print(f"[delete_task_from_supabase] Sending data to Supabase: {data}")
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        print(f"[delete_task_from_supabase] Supabase response: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"[delete_task_from_supabase] SUCCESS - Deleted task: {task.title} (ID: {task.id})")
            return True
        else:
            print(f"[delete_task_from_supabase] FAILED - Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error deleting task '{task.title}' from Supabase: {e}")
        return False

def sync_productivity_log_to_supabase(productivity_log):
    """
    Sync a Django ProductivityLog to Supabase
    
    Args:
        productivity_log: Django ProductivityLog instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"🔄 [sync_productivity_log_to_supabase] STARTING - Log ID: {productivity_log.id}, User: {productivity_log.user.username}")
        
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(productivity_log.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync productivity log - user '{productivity_log.user.username}' not found in Supabase")
            return False
        
        print(f"✅ [sync_productivity_log_to_supabase] Found Supabase user ID: {supabase_user_id}")
        
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
        
        print(f"📤 [sync_productivity_log_to_supabase] Sending data to Supabase: {data}")
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/productivity_logs",
            headers=get_supabase_headers(),
            json=data
        )
        
        print(f"📥 [sync_productivity_log_to_supabase] Supabase response: {response.status_code}")
        
        if response.status_code == 201:
            print(f"✅ [sync_productivity_log_to_supabase] SUCCESS - Synced productivity log: {productivity_log.user.username} - {productivity_log.period_type} (ID: {productivity_log.id})")
            return True
        else:
            print(f"❌ [sync_productivity_log_to_supabase] FAILED - Status: {response.status_code}, Response: {response.text}")
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
