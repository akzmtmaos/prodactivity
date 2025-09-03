#!/usr/bin/env python3
"""
Script to create sample data for testing Progress page
"""

import os
import sys
import django
from datetime import datetime, timedelta, date

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from tasks.models import Task, XPLog, ProductivityLog
from decks.models import QuizSession

def create_sample_data():
    """Create sample data for testing"""
    print("Creating sample data for Progress page testing...")
    
    # Get or create test user
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
    
    # Create sample tasks for the last 30 days
    today = date.today()
    
    # Create tasks for different days with varying completion rates
    sample_data = [
        # Today - 90% completion (9/10 tasks completed)
        (today, 10, 9, 'Highly Productive'),
        # Yesterday - 75% completion (6/8 tasks completed)
        (today - timedelta(days=1), 8, 6, 'Productive'),
        # 2 days ago - 60% completion (3/5 tasks completed)
        (today - timedelta(days=2), 5, 3, 'Moderately Productive'),
        # 3 days ago - 100% completion (5/5 tasks completed)
        (today - timedelta(days=3), 5, 5, 'Highly Productive'),
        # 4 days ago - 40% completion (2/5 tasks completed)
        (today - timedelta(days=4), 5, 2, 'Moderately Productive'),
        # 5 days ago - 80% completion (4/5 tasks completed)
        (today - timedelta(days=5), 5, 4, 'Productive'),
        # 6 days ago - 20% completion (1/5 tasks completed)
        (today - timedelta(days=6), 5, 1, 'Low Productivity'),
        # 7 days ago - 100% completion (3/3 tasks completed)
        (today - timedelta(days=7), 3, 3, 'Highly Productive'),
    ]
    
    # Create tasks and productivity logs
    for task_date, total_tasks, completed_tasks, expected_status in sample_data:
        print(f"\nCreating data for {task_date}: {completed_tasks}/{total_tasks} tasks completed")
        
        # Create tasks for this day
        for i in range(total_tasks):
            task = Task.objects.create(
                user=user,
                title=f"Sample Task {i+1} for {task_date}",
                description=f"Sample task description {i+1}",
                due_date=task_date,
                completed=(i < completed_tasks),  # First N tasks are completed
                category='study'
            )
            
            # Add XP for completed tasks
            if i < completed_tasks:
                XPLog.objects.create(
                    user=user,
                    task=task,
                    xp=10,  # 10 XP per completed task
                    awarded_at=datetime.now()
                )
        
        # Create productivity log for this day
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Determine status based on completion rate
        if completion_rate >= 90:
            status = 'Highly Productive'
        elif completion_rate >= 70:
            status = 'Productive'
        elif completion_rate >= 40:
            status = 'Moderately Productive'
        else:
            status = 'Low Productivity'
        
        # Create or update productivity log
        log, created = ProductivityLog.objects.get_or_create(
            user=user,
            period_type='daily',
            period_start=task_date,
            period_end=task_date,
            defaults={
                'completion_rate': completion_rate,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'status': status
            }
        )
        
        if not created:
            log.completion_rate = completion_rate
            log.total_tasks = total_tasks
            log.completed_tasks = completed_tasks
            log.status = status
            log.save()
        
        print(f"  Created productivity log: {status} ({completion_rate:.1f}%)")
    
    # Create some quiz sessions for XP
    for i in range(5):
        QuizSession.objects.create(
            user=user,
            deck_id=1,  # Assuming deck ID 1 exists
            score=80 + (i * 5),  # Varying scores
            completed_at=datetime.now() - timedelta(days=i)
        )
    
    print(f"\nCreated {QuizSession.objects.filter(user=user).count()} quiz sessions")
    
    # Calculate total XP
    from django.db import models
    xp_from_tasks = XPLog.objects.filter(user=user).aggregate(total=models.Sum('xp'))['total'] or 0
    xp_from_quizzes = QuizSession.objects.filter(user=user).count() * 20
    total_xp = xp_from_tasks + xp_from_quizzes
    
    print(f"\nTotal XP: {total_xp}")
    print(f"  From tasks: {xp_from_tasks}")
    print(f"  From quizzes: {xp_from_quizzes}")
    
    # Calculate level
    level = 1
    xp_needed = 100
    xp_remaining = total_xp
    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed += 100
    
    print(f"Current Level: {level}")
    print(f"Current XP: {xp_remaining}")
    print(f"XP to Next Level: {xp_needed}")
    
    print("\nSample data creation completed!")

if __name__ == "__main__":
    create_sample_data()
