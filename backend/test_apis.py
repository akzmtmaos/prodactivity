#!/usr/bin/env python3
"""
Simple test script to check backend APIs
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from progress.views import user_level, user_stats, user_productivity, productivity_log_list
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate

def test_apis():
    """Test the progress APIs"""
    print("Testing Progress APIs...")
    
    # Create a test user if it doesn't exist
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={'email': 'test@example.com'}
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"Created test user: {user.username}")
    else:
        print(f"Using existing test user: {user.username}")
    
    # Create API request factory
    factory = APIRequestFactory()
    
    # Test user_level API
    print("\n=== Testing user_level API ===")
    request = factory.get('/api/progress/level/')
    force_authenticate(request, user=user)
    response = user_level(request)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")
    
    # Test user_stats API
    print("\n=== Testing user_stats API ===")
    request = factory.get('/api/progress/stats/')
    force_authenticate(request, user=user)
    response = user_stats(request)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")
    
    # Test user_productivity API
    print("\n=== Testing user_productivity API ===")
    request = factory.get('/api/progress/productivity/?view=daily&date=2025-01-23')
    force_authenticate(request, user=user)
    response = user_productivity(request)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")
    
    # Test productivity_log_list API
    print("\n=== Testing productivity_log_list API ===")
    request = factory.get('/api/progress/productivity_logs/?view=daily&date=2025-01-01')
    force_authenticate(request, user=user)
    response = productivity_log_list(request)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")
    
    print("\n=== API Tests Completed ===")

if __name__ == "__main__":
    test_apis()
