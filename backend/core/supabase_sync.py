#!/usr/bin/env python3
"""
Supabase sync functions for core models (notifications, terms, AI configs)
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

def sync_notification_to_supabase(notification):
    """
    Sync a Django notification to Supabase
    
    Args:
        notification: Django Notification instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(notification.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync notification '{notification.title}' - user '{notification.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': notification.id,
            'user_id': supabase_user_id,
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type,
            'is_read': notification.is_read,
            'created_at': notification.created_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/notifications",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced notification to Supabase: {notification.title} (ID: {notification.id})")
            return True
        else:
            print(f"❌ Failed to sync notification '{notification.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing notification '{notification.title}' to Supabase: {e}")
        return False

def update_notification_in_supabase(notification):
    """
    Update an existing notification in Supabase
    
    Args:
        notification: Django Notification instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(notification.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update notification '{notification.title}' - user '{notification.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'user_id': supabase_user_id,
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type,
            'is_read': notification.is_read
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/notifications?id=eq.{notification.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated notification in Supabase: {notification.title} (ID: {notification.id})")
            return True
        else:
            print(f"❌ Failed to update notification '{notification.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating notification '{notification.title}' in Supabase: {e}")
        return False

def sync_terms_and_conditions_to_supabase(terms):
    """
    Sync Django TermsAndConditions to Supabase
    
    Args:
        terms: Django TermsAndConditions instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare data for Supabase
        data = {
            'id': terms.id,
            'content': terms.content,
            'last_updated': terms.last_updated.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/terms_and_conditions",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced terms and conditions to Supabase (ID: {terms.id})")
            return True
        else:
            print(f"❌ Failed to sync terms and conditions to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing terms and conditions to Supabase: {e}")
        return False

def update_terms_and_conditions_in_supabase(terms):
    """
    Update existing TermsAndConditions in Supabase
    
    Args:
        terms: Django TermsAndConditions instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare data for Supabase
        data = {
            'content': terms.content,
            'last_updated': terms.last_updated.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/terms_and_conditions?id=eq.{terms.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated terms and conditions in Supabase (ID: {terms.id})")
            return True
        else:
            print(f"❌ Failed to update terms and conditions in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating terms and conditions in Supabase: {e}")
        return False

def sync_ai_configuration_to_supabase(ai_config):
    """
    Sync Django AIConfiguration to Supabase
    
    Args:
        ai_config: Django AIConfiguration instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare data for Supabase
        data = {
            'id': ai_config.id,
            'config_type': ai_config.config_type,
            'title': ai_config.title,
            'prompt_template': ai_config.prompt_template,
            'is_active': ai_config.is_active,
            'description': ai_config.description or '',
            'created_at': ai_config.created_at.isoformat(),
            'updated_at': ai_config.updated_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/ai_configurations",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced AI configuration to Supabase: {ai_config.title} (ID: {ai_config.id})")
            return True
        else:
            print(f"❌ Failed to sync AI configuration '{ai_config.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing AI configuration '{ai_config.title}' to Supabase: {e}")
        return False

def update_ai_configuration_in_supabase(ai_config):
    """
    Update existing AIConfiguration in Supabase
    
    Args:
        ai_config: Django AIConfiguration instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare data for Supabase
        data = {
            'config_type': ai_config.config_type,
            'title': ai_config.title,
            'prompt_template': ai_config.prompt_template,
            'is_active': ai_config.is_active,
            'description': ai_config.description or '',
            'updated_at': ai_config.updated_at.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/ai_configurations?id=eq.{ai_config.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated AI configuration in Supabase: {ai_config.title} (ID: {ai_config.id})")
            return True
        else:
            print(f"❌ Failed to update AI configuration '{ai_config.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating AI configuration '{ai_config.title}' in Supabase: {e}")
        return False
