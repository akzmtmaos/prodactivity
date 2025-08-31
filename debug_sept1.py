#!/usr/bin/env python3
"""
Debug script to check September 1, 2025 productivity data.
"""

import os
import sys
import django
from datetime import datetime, date

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tasks.models import Task, ProductivityLog
from django.contrib.auth.models import User

def debug_sept1_data():
    """Debug September 1, 2025 data"""
    print("=== Debugging September 1, 2025 Data ===")
    
    # Check if we have any users
    users = User.objects.all()
    print(f"Total users: {users.count()}")
    
    if users.exists():
        user = users.first()
        print(f"Using user: {user.username}")
        
        # Check tasks for September 1, 2025
        sept1_date = date(2025, 9, 1)
        tasks = Task.all_objects.filter(user=user, due_date=sept1_date)
        print(f"\nTasks for September 1, 2025: {tasks.count()}")
        
        for task in tasks:
            print(f"  - {task.title}: completed={task.completed}, is_deleted={task.is_deleted}")
        
        # Check productivity logs for September 1, 2025
        logs = ProductivityLog.objects.filter(
            user=user, 
            period_type='daily',
            period_start=sept1_date,
            period_end=sept1_date
        )
        print(f"\nProductivity logs for September 1, 2025: {logs.count()}")
        
        for log in logs:
            print(f"  - Log: {log.completion_rate}%, {log.status}, {log.total_tasks} tasks, {log.completed_tasks} completed")
        
        # Check all daily logs for September 2025
        sept_logs = ProductivityLog.objects.filter(
            user=user,
            period_type='daily',
            period_start__year=2025,
            period_start__month=9
        ).order_by('period_start')
        
        print(f"\nAll September 2025 daily logs: {sept_logs.count()}")
        for log in sept_logs:
            print(f"  - {log.period_start}: {log.completion_rate}%, {log.status}")
        
        # Check what today's date is according to Django
        from django.utils import timezone
        today = timezone.localdate()
        print(f"\nToday's date (Django): {today}")
        print(f"September 1, 2025: {sept1_date}")
        print(f"Is September 1 today? {today == sept1_date}")
        
    else:
        print("No users found in database")

if __name__ == "__main__":
    debug_sept1_data()
