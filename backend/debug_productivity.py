#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from progress.views import user_productivity
from django.utils import timezone

def test_productivity_api():
    """Test the productivity API endpoint directly"""
    user = User.objects.first()
    if not user:
        print("❌ No users found")
        return
    
    print(f"Testing productivity API for user: {user.username}")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/progress/productivity/?view=daily')
    request.user = user
    
    # Call the API view
    from rest_framework.test import force_authenticate
    force_authenticate(request, user=user)
    
    try:
        response = user_productivity(request)
        print(f"API Response Status: {response.status_code}")
        print(f"API Response Data: {response.data}")
        
        if response.status_code == 200:
            data = response.data
            print(f"\nProductivity Data:")
            print(f"  Status: {data.get('status')}")
            print(f"  Completion Rate: {data.get('completion_rate')}%")
            print(f"  Total Tasks: {data.get('total_tasks')}")
            print(f"  Completed Tasks: {data.get('completed_tasks')}")
        else:
            print(f"❌ API returned error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error calling API: {e}")

if __name__ == "__main__":
    test_productivity_api() 