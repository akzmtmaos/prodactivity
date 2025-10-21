#!/usr/bin/env python3
"""
Supabase sync functions for notebooks and notes
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
        print(f"Error getting Supabase user ID for {django_user.username}: {e}")
        return None

def sync_notebook_to_supabase(notebook):
    """
    Sync a Django notebook to Supabase
    
    Args:
        notebook: Django Notebook instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(notebook.user)
        if not supabase_user_id:
            print(f"WARNING: Cannot sync notebook '{notebook.name}' - user '{notebook.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': notebook.id,
            'name': notebook.name,
            'user_id': supabase_user_id,
            'notebook_type': notebook.notebook_type,
            'urgency_level': notebook.urgency_level,
            'description': notebook.description or '',
            'created_at': notebook.created_at.isoformat(),
            'updated_at': notebook.updated_at.isoformat(),
            'is_archived': notebook.is_archived,
            'archived_at': notebook.archived_at.isoformat() if notebook.archived_at else None,
            'is_favorite': notebook.is_favorite,
            'is_deleted': notebook.is_deleted,
            'deleted_at': notebook.deleted_at.isoformat() if notebook.deleted_at else None
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/notebooks",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"SUCCESS: Synced notebook to Supabase: {notebook.name} (ID: {notebook.id})")
            return True
        else:
            print(f"ERROR: Failed to sync notebook '{notebook.name}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error syncing notebook '{notebook.name}' to Supabase: {e}")
        return False

def update_notebook_in_supabase(notebook):
    """
    Update an existing notebook in Supabase
    
    Args:
        notebook: Django Notebook instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(notebook.user)
        if not supabase_user_id:
            print(f"WARNING: Cannot update notebook '{notebook.name}' - user '{notebook.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'name': notebook.name,
            'user_id': supabase_user_id,
            'notebook_type': notebook.notebook_type,
            'urgency_level': notebook.urgency_level,
            'description': notebook.description or '',
            'updated_at': notebook.updated_at.isoformat(),
            'is_archived': notebook.is_archived,
            'archived_at': notebook.archived_at.isoformat() if notebook.archived_at else None,
            'is_favorite': notebook.is_favorite,
            'is_deleted': notebook.is_deleted,
            'deleted_at': notebook.deleted_at.isoformat() if notebook.deleted_at else None
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/notebooks?id=eq.{notebook.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"SUCCESS: Updated notebook in Supabase: {notebook.name} (ID: {notebook.id})")
            return True
        else:
            print(f"ERROR: Failed to update notebook '{notebook.name}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error updating notebook '{notebook.name}' in Supabase: {e}")
        return False

def sync_note_to_supabase(note):
    """
    Sync a Django note to Supabase
    
    Args:
        note: Django Note instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(note.user)
        if not supabase_user_id:
            print(f"WARNING: Cannot sync note '{note.title}' - user '{note.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'notebook_id': note.notebook.id,
            'user_id': supabase_user_id,
            'note_type': note.note_type,
            'priority': note.priority,
            'is_urgent': note.is_urgent,
            'tags': note.tags or '',
            'created_at': note.created_at.isoformat(),
            'updated_at': note.updated_at.isoformat(),
            'is_deleted': note.is_deleted,
            'deleted_at': note.deleted_at.isoformat() if note.deleted_at else None,
            'is_archived': note.is_archived,
            'archived_at': note.archived_at.isoformat() if note.archived_at else None,
            'last_visited': note.last_visited.isoformat() if note.last_visited else None
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/notes",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"SUCCESS: Synced note to Supabase: {note.title} (ID: {note.id})")
            return True
        else:
            print(f"ERROR: Failed to sync note '{note.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error syncing note '{note.title}' to Supabase: {e}")
        return False

def update_note_in_supabase(note):
    """
    Update an existing note in Supabase
    
    Args:
        note: Django Note instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(note.user)
        if not supabase_user_id:
            print(f"WARNING: Cannot update note '{note.title}' - user '{note.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'title': note.title,
            'content': note.content,
            'notebook_id': note.notebook.id,
            'user_id': supabase_user_id,
            'note_type': note.note_type,
            'priority': note.priority,
            'is_urgent': note.is_urgent,
            'tags': note.tags or '',
            'updated_at': note.updated_at.isoformat(),
            'is_deleted': note.is_deleted,
            'deleted_at': note.deleted_at.isoformat() if note.deleted_at else None,
            'is_archived': note.is_archived,
            'archived_at': note.archived_at.isoformat() if note.archived_at else None,
            'last_visited': note.last_visited.isoformat() if note.last_visited else None
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/notes?id=eq.{note.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"SUCCESS: Updated note in Supabase: {note.title} (ID: {note.id})")
            return True
        else:
            print(f"ERROR: Failed to update note '{note.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error updating note '{note.title}' in Supabase: {e}")
        return False
