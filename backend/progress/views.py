from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from tasks.models import Task, XPLog, ProductivityLog
from decks.models import QuizSession
from django.utils import timezone
from datetime import timedelta
from django.db import models
from calendar import monthrange

# Create your views here.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    user = request.user
    tasks = Task.all_objects.filter(user=user, is_deleted=False)
    completed_tasks = tasks.filter(completed=True)
    total_tasks_completed = completed_tasks.count()
    total_study_time = completed_tasks.filter(category='study').count()  # Proxy: 1 study task = 1 unit time
    total_tasks = tasks.count()
    average_productivity = int((total_tasks_completed / total_tasks) * 100) if total_tasks > 0 else 0

    # Calculate streak: consecutive days with at least one completed task
    streak = 0
    today = timezone.localdate()
    day = today
    while True:
        if completed_tasks.filter(due_date=day).exists():
            streak += 1
            day -= timedelta(days=1)
        else:
            break

    # Add XP from completed QuizSessions
    quiz_sessions = QuizSession.objects.filter(user=user)
    total_quizzes_completed = quiz_sessions.count()

    data = {
        'totalTasksCompleted': total_tasks_completed,
        'totalStudyTime': total_study_time,
        'averageProductivity': average_productivity,
        'streak': streak,
        'totalQuizzesCompleted': total_quizzes_completed
    }
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_level(request):
    user = request.user
    # Sum XP from XPLog
    xp_from_tasks = XPLog.objects.filter(user=user).aggregate(total=models.Sum('xp'))['total'] or 0
    # Add XP from completed QuizSessions
    quiz_sessions = QuizSession.objects.filter(user=user)
    xp_from_quizzes = quiz_sessions.count() * 20
    total_xp = xp_from_tasks + xp_from_quizzes
    # Leveling: each level requires 100 more XP than the previous
    level = 1
    xp_needed = 100
    xp_remaining = total_xp
    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed += 100
    current_level = level
    current_xp = xp_remaining
    xp_to_next_level = xp_needed
    data = {
        'currentLevel': current_level,
        'currentXP': current_xp,
        'xpToNextLevel': xp_to_next_level
    }
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_streaks(request):
    # TODO: Implement real streak calendar data
    data = [
        {'date': '2024-06-01', 'completed': True},
        # ...
    ]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_chart(request):
    view = request.GET.get('view', 'weekly')
    # TODO: Implement real chart data based on 'view'
    data = {}
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_productivity(request):
    from tasks.models import Task, ProductivityLog
    from django.utils import timezone
    from datetime import timedelta, datetime as dt
    from django.db import transaction

    user = request.user
    view = request.GET.get('view', 'weekly').lower()
    date_str = request.GET.get('date')
    lock = request.GET.get('lock') == '1'
    today = timezone.localdate()

    # Determine period
    if view == 'daily':
        if date_str:
            try:
                target_date = dt.strptime(date_str, '%Y-%m-%d').date()
            except Exception:
                target_date = today
        else:
            target_date = today
        start = target_date
        end = target_date
    elif view == 'monthly':
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year+1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month+1, day=1) - timedelta(days=1)
    else:  # weekly (default)
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)

    # If the period is in the past, use or create a log
    is_current_period = (view == 'daily' and start == today) or \
                       (view == 'weekly' and start <= today <= end) or \
                       (view == 'monthly' and start.month == today.month and start.year == today.year)

    # For current period, always calculate live (do not use the log)
    # Only use the log for past periods
    if not is_current_period:
        log = ProductivityLog.objects.filter(user=user, period_type=view, period_start=start, period_end=end).first()
        if log:
            data = {
                'status': log.status,
                'completion_rate': log.completion_rate,
                'total_tasks': log.total_tasks,
                'completed_tasks': log.completed_tasks
            }
            return Response(data)

    # Calculate live
    # For productivity, denominator should be:
    # - All non-deleted tasks
    # - Only deleted tasks that were completed (was_completed_on_delete=True)
    tasks = Task.all_objects.filter(user=user, due_date__range=(start, end))
    non_deleted = tasks.filter(is_deleted=False)
    deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
    total_tasks = non_deleted.count() + deleted_completed.count()
    completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()

    if total_tasks == 0:
        data = {
            'status': 'No Tasks',
            'completion_rate': 0,
            'total_tasks': 0,
            'completed_tasks': 0
        }
    else:
        completion_rate = completed_tasks / total_tasks
        completion_pct = completion_rate * 100
        if completion_pct >= 90:
            status = 'Highly Productive'
        elif completion_pct >= 70:
            status = 'Productive'
        elif completion_pct >= 40:
            status = 'Needs Improvement'
        else:
            status = 'Low Productivity'
        data = {
            'status': status,
            'completion_rate': round(completion_pct, 2),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks
        }
    # Log for past periods or if lock requested
    if (not is_current_period) or (is_current_period and lock):
        with transaction.atomic():
            ProductivityLog.objects.get_or_create(
                user=user,
                period_type=view,
                period_start=start,
                period_end=end,
                defaults={
                    'completion_rate': data['completion_rate'],
                    'total_tasks': data['total_tasks'],
                    'completed_tasks': data['completed_tasks'],
                    'status': data['status']
                }
            )
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def productivity_log_list(request):
    from tasks.models import ProductivityLog
    from django.utils import timezone
    from datetime import datetime, timedelta
    user = request.user
    view = request.GET.get('view', 'daily').lower()
    date_str = request.GET.get('date')
    today = timezone.localdate()
    # Parse base date
    if date_str:
        try:
            base_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Exception:
            base_date = today
    else:
        base_date = today
    data = []
    if view == 'daily':
        # List all days in the month
        year = base_date.year
        month = base_date.month
        num_days = monthrange(year, month)[1]
        for day in range(num_days, 0, -1):
            d = datetime(year, month, day).date()
            log = ProductivityLog.objects.filter(user=user, period_type='daily', period_start=d, period_end=d).first()
            data.append({
                'date': d,
                'log': {
                    'status': log.status if log else 'No Data',
                    'completion_rate': log.completion_rate if log else 0,
                    'total_tasks': log.total_tasks if log else 0,
                    'completed_tasks': log.completed_tasks if log else 0
                }
            })
    elif view == 'weekly':
        # List all weeks in the year
        year = base_date.year
        # Find the first Monday of the year
        d = datetime(year, 1, 1).date()
        while d.weekday() != 0:
            d += timedelta(days=1)
        # Go through each week
        while d.year == year:
            week_start = d
            week_end = week_start + timedelta(days=6)
            log = ProductivityLog.objects.filter(user=user, period_type='weekly', period_start=week_start, period_end=week_end).first()
            data.append({
                'week_start': week_start,
                'week_end': week_end,
                'log': {
                    'status': log.status if log else 'No Data',
                    'completion_rate': log.completion_rate if log else 0,
                    'total_tasks': log.total_tasks if log else 0,
                    'completed_tasks': log.completed_tasks if log else 0
                }
            })
            d += timedelta(days=7)
    elif view == 'monthly':
        # List all months in the year
        year = base_date.year
        for month in range(12, 0, -1):
            first = datetime(year, month, 1).date()
            last = datetime(year, month, monthrange(year, month)[1]).date()
            log = ProductivityLog.objects.filter(user=user, period_type='monthly', period_start=first, period_end=last).first()
            data.append({
                'month': month,
                'log': {
                    'status': log.status if log else 'No Data',
                    'completion_rate': log.completion_rate if log else 0,
                    'total_tasks': log.total_tasks if log else 0,
                    'completed_tasks': log.completed_tasks if log else 0
                }
            })
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_today_tasks(request):
    from tasks.models import Task
    from django.utils import timezone
    user = request.user
    today = timezone.localdate()
    tasks = Task.all_objects.filter(user=user, due_date=today)
    data = [
        {
            'id': t.id,
            'title': t.title,
            'completed': t.completed,
            'is_deleted': t.is_deleted,
            'was_completed_on_delete': t.was_completed_on_delete
        }
        for t in tasks
    ]
    return Response(data)
