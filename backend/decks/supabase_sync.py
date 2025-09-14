#!/usr/bin/env python3
"""
Supabase sync functions for decks, flashcards, and quiz sessions
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

def sync_deck_to_supabase(deck):
    """
    Sync a Django deck to Supabase
    
    Args:
        deck: Django Deck instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(deck.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync deck '{deck.title}' - user '{deck.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': deck.id,
            'title': deck.title,
            'user_id': supabase_user_id,
            'parent_id': deck.parent.id if deck.parent else None,
            'created_at': deck.created_at.isoformat(),
            'updated_at': deck.updated_at.isoformat(),
            'progress': deck.progress,
            'is_deleted': deck.is_deleted,
            'deleted_at': deck.deleted_at.isoformat() if deck.deleted_at else None,
            'is_archived': deck.is_archived,
            'archived_at': deck.archived_at.isoformat() if deck.archived_at else None
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/decks",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced deck to Supabase: {deck.title} (ID: {deck.id})")
            return True
        else:
            print(f"❌ Failed to sync deck '{deck.title}' to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing deck '{deck.title}' to Supabase: {e}")
        return False

def update_deck_in_supabase(deck):
    """
    Update an existing deck in Supabase
    
    Args:
        deck: Django Deck instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(deck.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update deck '{deck.title}' - user '{deck.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'title': deck.title,
            'user_id': supabase_user_id,
            'parent_id': deck.parent.id if deck.parent else None,
            'updated_at': deck.updated_at.isoformat(),
            'progress': deck.progress,
            'is_deleted': deck.is_deleted,
            'deleted_at': deck.deleted_at.isoformat() if deck.deleted_at else None,
            'is_archived': deck.is_archived,
            'archived_at': deck.archived_at.isoformat() if deck.archived_at else None
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/decks?id=eq.{deck.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated deck in Supabase: {deck.title} (ID: {deck.id})")
            return True
        else:
            print(f"❌ Failed to update deck '{deck.title}' in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating deck '{deck.title}' in Supabase: {e}")
        return False

def sync_flashcard_to_supabase(flashcard):
    """
    Sync a Django flashcard to Supabase
    
    Args:
        flashcard: Django Flashcard instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(flashcard.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync flashcard - user '{flashcard.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': flashcard.id,
            'deck_id': flashcard.deck.id,
            'user_id': supabase_user_id,
            'front': flashcard.front,
            'back': flashcard.back,
            'created_at': flashcard.created_at.isoformat(),
            'updated_at': flashcard.updated_at.isoformat(),
            'is_deleted': flashcard.is_deleted,
            'deleted_at': flashcard.deleted_at.isoformat() if flashcard.deleted_at else None
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/flashcards",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced flashcard to Supabase: {flashcard.front[:30]}... (ID: {flashcard.id})")
            return True
        else:
            print(f"❌ Failed to sync flashcard to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing flashcard to Supabase: {e}")
        return False

def update_flashcard_in_supabase(flashcard):
    """
    Update an existing flashcard in Supabase
    
    Args:
        flashcard: Django Flashcard instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(flashcard.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update flashcard - user '{flashcard.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'deck_id': flashcard.deck.id,
            'user_id': supabase_user_id,
            'front': flashcard.front,
            'back': flashcard.back,
            'updated_at': flashcard.updated_at.isoformat(),
            'is_deleted': flashcard.is_deleted,
            'deleted_at': flashcard.deleted_at.isoformat() if flashcard.deleted_at else None
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/flashcards?id=eq.{flashcard.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated flashcard in Supabase: {flashcard.front[:30]}... (ID: {flashcard.id})")
            return True
        else:
            print(f"❌ Failed to update flashcard in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating flashcard in Supabase: {e}")
        return False

def sync_quiz_session_to_supabase(quiz_session):
    """
    Sync a Django quiz session to Supabase
    
    Args:
        quiz_session: Django QuizSession instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(quiz_session.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot sync quiz session - user '{quiz_session.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'id': quiz_session.id,
            'user_id': supabase_user_id,
            'deck_id': quiz_session.deck.id,
            'score': quiz_session.score,
            'completed_at': quiz_session.completed_at.isoformat(),
            'created_at': quiz_session.created_at.isoformat()
        }
        
        # Insert into Supabase
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/quiz_sessions",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 201:
            print(f"✅ Synced quiz session to Supabase: {quiz_session.user.username} - {quiz_session.deck.title} (ID: {quiz_session.id})")
            return True
        else:
            print(f"❌ Failed to sync quiz session to Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error syncing quiz session to Supabase: {e}")
        return False

def update_quiz_session_in_supabase(quiz_session):
    """
    Update an existing quiz session in Supabase
    
    Args:
        quiz_session: Django QuizSession instance
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get Supabase user ID
        supabase_user_id = get_user_supabase_id(quiz_session.user)
        if not supabase_user_id:
            print(f"⚠️  Cannot update quiz session - user '{quiz_session.user.username}' not found in Supabase")
            return False
        
        # Prepare data for Supabase
        data = {
            'user_id': supabase_user_id,
            'deck_id': quiz_session.deck.id,
            'score': quiz_session.score,
            'completed_at': quiz_session.completed_at.isoformat()
        }
        
        # Update in Supabase
        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/quiz_sessions?id=eq.{quiz_session.id}",
            headers=get_supabase_headers(),
            json=data
        )
        
        if response.status_code == 200 or response.status_code == 204:
            print(f"✅ Updated quiz session in Supabase: {quiz_session.user.username} - {quiz_session.deck.title} (ID: {quiz_session.id})")
            return True
        else:
            print(f"❌ Failed to update quiz session in Supabase: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating quiz session in Supabase: {e}")
        return False
