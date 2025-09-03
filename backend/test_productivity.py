#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from tasks.models import Task
from django.utils import timezone
from datetime import date

def test_productivity_calculation():
    """Test the productivity calculation logic"""
    today = timezone.localdate()
    
    # Get the first user
    user = User.objects.first()
    if not user:
        print("❌ No users found")
        return
    
    print(f"Testing productivity for user: {user.username}")
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
    
    # Calculate productivity
    if tasks.count() > 0:
        completion_rate = (completed_tasks.count() / tasks.count()) * 100
        print(f"\nCompletion rate: {completion_rate}%")
        
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
        print("No tasks for today")

if __name__ == "__main__":
    test_productivity_calculation() 