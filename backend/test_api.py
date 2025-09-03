#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_productivity_api():
    """Test the productivity API endpoint"""
    # You'll need to get a valid token first
    # For now, let's just test the backend calculation
    
    from django.contrib.auth.models import User
    from tasks.models import Task
    from django.utils import timezone
    
    today = timezone.localdate()
    user = User.objects.first()
    
    if not user:
        print("❌ No users found")
        return
    
    print(f"Testing productivity API for user: {user.username}")
    print(f"Today's date: {today}")
    
    # Get today's tasks
    tasks = Task.all_objects.filter(user=user, due_date=today, is_deleted=False)
    completed_tasks = tasks.filter(completed=True)
    
    print(f"Total tasks for today: {tasks.count()}")
    print(f"Completed tasks: {completed_tasks.count()}")
    
    # Show all tasks
    print("\nAll tasks for today:")
    for task in tasks:
        print(f"  - {task.title} (completed: {task.completed})")
    
    # Calculate productivity manually
    if tasks.count() > 0:
        completion_rate = (completed_tasks.count() / tasks.count()) * 100
        print(f"\nManual calculation - Completion rate: {completion_rate}%")
        
        if completion_rate >= 90:
            status = 'Highly Productive'
        elif completion_rate >= 70:
            status = 'Productive'
        elif completion_rate >= 40:
            status = 'Moderately Productive'
        else:
            status = 'Low Productivity'
        
        print(f"Status: {status}")
    else:
        print("No tasks for today - should show 0%")

if __name__ == "__main__":
    test_productivity_api() 