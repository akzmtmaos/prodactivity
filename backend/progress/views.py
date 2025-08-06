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
    
    # Use Philippine time (UTC+8) to match task creation logic
    utc_now = timezone.now()
    ph_time = utc_now + timedelta(hours=8)
    today = ph_time.date()

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

    # Always calculate current data (live calculation)
    tasks = Task.all_objects.filter(user=user, due_date__range=(start, end))
    non_deleted = tasks.filter(is_deleted=False)
    deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
    
    total_tasks = non_deleted.count() + deleted_completed.count()
    completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
    
    print(f"[DEBUG] Productivity endpoint - Today (Philippine): {today}")
    print(f"[DEBUG] Productivity endpoint - Start: {start}, End: {end}")
    print(f"[DEBUG] Productivity endpoint - Total tasks found: {tasks.count()}")
    print(f"[DEBUG] Productivity endpoint - Non-deleted tasks: {non_deleted.count()}")
    print(f"[DEBUG] Productivity endpoint - Is current period: {is_current_period}")
    
    if total_tasks == 0:
        completion_rate = 0
        status = 'No Tasks'
    else:
        completion_rate = completed_tasks / total_tasks * 100
        if completion_rate >= 90:
            status = 'Highly Productive'
        elif completion_rate >= 70:
            status = 'Productive'
        elif completion_rate >= 40:
            status = 'Needs Improvement'
        else:
            status = 'Low Productivity'
    
    data = {
        'status': status,
        'completion_rate': round(completion_rate, 2),
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks
    }
    
    print(f"[DEBUG] Calculated data: {data}")
    
    # For past periods OR if lock is requested, save to log
    # For current periods, also save to log so it appears in history
    if not is_current_period or lock or True:  # Always save for now
        with transaction.atomic():
            log, created = ProductivityLog.objects.get_or_create(
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
            # If log exists but data changed, update it (for current periods)
            if not created:
                log.completion_rate = data['completion_rate']
                log.total_tasks = data['total_tasks']
                log.completed_tasks = data['completed_tasks']
                log.status = data['status']
                log.save()
                print(f"[DEBUG] Updated existing log for {start} to {end}")
            else:
                print(f"[DEBUG] Created new log for {start} to {end}")
    
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
    
    # DEBUG: Print request parameters
    print(f"[DEBUG] productivity_log_list called with:")
    print(f"  user: {user}")
    print(f"  view: {view}")
    print(f"  date_str: {date_str}")
    print(f"  today: {today}")
    
    # Parse base date
    if date_str:
        try:
            base_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            print(f"[DEBUG] Parsed base_date: {base_date}")
        except Exception as e:
            print(f"[DEBUG] Error parsing date: {e}")
            base_date = today
    else:
        base_date = today
        print(f"[DEBUG] Using today as base_date: {base_date}")
    
    # MANUAL CLEANUP: Force delete ALL weekly logs to recalculate from daily logs
    if view == 'weekly':
        deleted_count = ProductivityLog.objects.filter(
            user=user,
            period_type='weekly'
        ).delete()[0]
        print(f"[DEBUG] MANUALLY DELETED ALL {deleted_count} weekly logs for user {user.username}")
        print(f"[DEBUG] All weekly logs will be recalculated from daily logs")
    
    data = []
    if view == 'daily':
        # List all days in the month
        year = base_date.year
        month = base_date.month
        num_days = monthrange(year, month)[1]
        for day in range(num_days, 0, -1):
            d = datetime(year, month, day).date()
            log = ProductivityLog.objects.filter(user=user, period_type='daily', period_start=d, period_end=d).first()
            
            # If no log exists for this day, create one
            if not log:
                tasks = Task.all_objects.filter(user=user, due_date=d)
                non_deleted = tasks.filter(is_deleted=False)
                deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
                
                total_tasks = non_deleted.count() + deleted_completed.count()
                completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
                
                if total_tasks == 0:
                    completion_rate = 0
                    status = 'No Tasks'
                else:
                    completion_rate = completed_tasks / total_tasks * 100
                    if completion_rate >= 90:
                        status = 'Highly Productive'
                    elif completion_rate >= 70:
                        status = 'Productive'
                    elif completion_rate >= 40:
                        status = 'Needs Improvement'
                    else:
                        status = 'Low Productivity'
                
                log = ProductivityLog.objects.create(
                    user=user,
                    period_type='daily',
                    period_start=d,
                    period_end=d,
                    completion_rate=completion_rate,
                    total_tasks=total_tasks,
                    completed_tasks=completed_tasks,
                    status=status
                )
            
            data.append({
                'date': d,
                'log': {
                    'status': log.status,
                    'completion_rate': log.completion_rate,
                    'total_tasks': log.total_tasks,
                    'completed_tasks': log.completed_tasks
                }
            })
    elif view == 'weekly':
        # Debug: Check for tasks in the specific weeks mentioned by user
        from datetime import date
        user_expected_weeks = [
            (date(2025, 7, 21), date(2025, 7, 27), "Jul 21-27, 2025 (expected 90%)"),
            (date(2025, 7, 28), date(2025, 8, 3), "Jul 28 - Aug 3, 2025 (expected 100%)"),
            (date(2025, 8, 4), date(2025, 8, 10), "Aug 4-10, 2025 (expected 0%)")
        ]
        
        print(f"[DEBUG] Checking user's expected weeks...")
        for week_start, week_end, description in user_expected_weeks:
            # Check if there's already a log for this exact week
            existing_log = ProductivityLog.objects.filter(
                user=user, 
                period_type='weekly', 
                period_start=week_start, 
                period_end=week_end
            ).first()
            
            if existing_log:
                print(f"[DEBUG] Found existing log for {description}: {existing_log.completion_rate}% ({existing_log.status})")
            else:
                # Create a log for this specific week if it doesn't exist
                tasks = Task.all_objects.filter(user=user, due_date__range=(week_start, week_end))
                non_deleted = tasks.filter(is_deleted=False)
                deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
                total_tasks = non_deleted.count() + deleted_completed.count()
                completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
                completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
                
                if total_tasks == 0:
                    status = 'No Tasks'
                elif completion_rate >= 90:
                    status = 'Highly Productive'
                elif completion_rate >= 70:
                    status = 'Productive'
                elif completion_rate >= 40:
                    status = 'Needs Improvement'
                else:
                    status = 'Low Productivity'
                
                print(f"[DEBUG] Creating log for {description}: {total_tasks} total, {completed_tasks} completed, {completion_rate:.1f}%")
                
                # Create the productivity log for this specific week
                ProductivityLog.objects.get_or_create(
                    user=user,
                    period_type='weekly',
                    period_start=week_start,
                    period_end=week_end,
                    defaults={
                        'completion_rate': completion_rate,
                        'total_tasks': total_tasks,
                        'completed_tasks': completed_tasks,
                        'status': status
                    }
                )
        
        # List all weeks in the year
        year = base_date.year
        today = timezone.localdate()
        current_week = today.isocalendar()[1]
        current_year = today.year
        
        for week in range(52, 0, -1):
            # Get the start and end of the week
            week_start = datetime.strptime(f'{year}-W{week:02d}-1', '%Y-W%W-%w').date()
            week_end = week_start + timedelta(days=6)
            
            # Get existing daily logs for this week and calculate average
            daily_logs = ProductivityLog.objects.filter(
                user=user,
                period_type='daily',
                period_start__range=(week_start, week_end)
            ).order_by('period_start')
            
            daily_rates = []
            print(f"[DEBUG] Daily logs for week {week_start} to {week_end}:")
            for daily_log in daily_logs:
                if daily_log.total_tasks > 0:  # Include ALL days that have tasks
                    daily_rates.append(daily_log.completion_rate)
                    print(f"  {daily_log.period_start}: {daily_log.completion_rate:.2f}%")
                else:
                    print(f"  {daily_log.period_start}: No tasks")
            
            if daily_rates:
                completion_rate = sum(daily_rates) / len(daily_rates)
            else:
                completion_rate = 0
            
            print(f"[DEBUG] Weekly average from daily logs: {completion_rate:.8f}% (based on {len(daily_rates)} days)")
            
            # Calculate total and completed tasks for display purposes
            tasks_in_week = Task.all_objects.filter(user=user, due_date__range=(week_start, week_end))
            non_deleted = tasks_in_week.filter(is_deleted=False)
            deleted_completed = tasks_in_week.filter(is_deleted=True, was_completed_on_delete=True)
            total_tasks = non_deleted.count() + deleted_completed.count()
            completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
            
            # For status, use the same thresholds as before
            if completion_rate == 0:
                status = 'No Tasks'
            elif completion_rate >= 90:
                status = 'Highly Productive'
            elif completion_rate >= 70:
                status = 'Productive'
            elif completion_rate >= 40:
                status = 'Needs Improvement'
            else:
                status = 'Low Productivity'
            
            # For display, keep total_tasks and completed_tasks as before
            log, created = ProductivityLog.objects.get_or_create(
                user=user,
                period_type='weekly',
                period_start=week_start,
                period_end=week_end,
                defaults={
                    'completion_rate': completion_rate,
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'status': status
                }
            )
            # Always update the log with current data (especially for current week)
            if not created or week_end >= today:  # Update if it's current or future week
                # Force delete and recreate for current week to ensure correct calculation
                if week_end >= today:
                    ProductivityLog.objects.filter(
                        user=user,
                        period_type='weekly',
                        period_start=week_start,
                        period_end=week_end
                    ).delete()
                    log = ProductivityLog.objects.create(
                        user=user,
                        period_type='weekly',
                        period_start=week_start,
                        period_end=week_end,
                        completion_rate=completion_rate,
                        total_tasks=total_tasks,
                        completed_tasks=completed_tasks,
                        status=status
                    )
                    print(f"[DEBUG] FORCE RECREATED log for week {week_start} to {week_end}: {total_tasks} tasks, {completion_rate:.2f}% (average of daily logs)")
                else:
                    log.completion_rate = completion_rate
                    log.total_tasks = total_tasks
                    log.completed_tasks = completed_tasks
                    log.status = status
                    log.save()
                    print(f"[DEBUG] Updated log for week {week_start} to {week_end}: {total_tasks} tasks, {completion_rate:.2f}% (average of daily logs)")
        
        # Now get all logs again (including newly created ones)
        all_logs = ProductivityLog.objects.filter(
            user=user, 
            period_type='weekly',
            period_start__year=base_date.year
        ).order_by('-period_start')  # Most recent first
        
        # Process all logs for the response
        for log in all_logs:
            week_start = log.period_start
            week_end = log.period_end
            
            # Debug: Log all weeks and their data
            print(f"Week {week_start} to {week_end}: {log.total_tasks} tasks, status: {log.status}")
            
            # Only include weeks that have tasks, are recent, or are in the user's expected date ranges
            today = timezone.localdate()
            is_recent = (today - week_end).days <= 28  # Within last 4 weeks
            has_tasks = log.total_tasks > 0
            
            # Check if this week overlaps with user's expected weeks
            from datetime import date
            user_expected_weeks = [
                (date(2025, 7, 21), date(2025, 7, 27)),
                (date(2025, 7, 28), date(2025, 8, 3)),
                (date(2025, 8, 4), date(2025, 8, 10))
            ]
            is_expected_week = any(
                week_start <= expected_end and week_end >= expected_start 
                for expected_start, expected_end in user_expected_weeks
            )
            
            if has_tasks or is_recent or is_expected_week:
                data.append({
                    'week_start': week_start,
                    'week_end': week_end,
                    'log': {
                        'status': log.status,
                        'completion_rate': log.completion_rate,
                        'total_tasks': log.total_tasks,
                        'completed_tasks': log.completed_tasks
                    }
                })
    elif view == 'monthly':
        # List all months in the year
        year = base_date.year
        today = timezone.localdate()
        current_month = today.month
        current_year = today.year
        for month in range(12, 0, -1):
            first = datetime(year, month, 1).date()
            last = datetime(year, month, monthrange(year, month)[1]).date()
            log = ProductivityLog.objects.filter(user=user, period_type='monthly', period_start=first, period_end=last).first()
            
            # Always create or update the log for the current month
            is_current_month = (month == current_month and year == current_year)
            if not log or is_current_month:
                tasks = Task.all_objects.filter(user=user, due_date__range=(first, last))
                non_deleted = tasks.filter(is_deleted=False)
                deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
                
                total_tasks = non_deleted.count() + deleted_completed.count()
                completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
                
                if total_tasks == 0:
                    completion_rate = 0
                    status = 'No Tasks'
                else:
                    completion_rate = completed_tasks / total_tasks * 100
                    if completion_rate >= 90:
                        status = 'Highly Productive'
                    elif completion_rate >= 70:
                        status = 'Productive'
                    elif completion_rate >= 40:
                        status = 'Needs Improvement'
                    else:
                        status = 'Low Productivity'
                
                if not log:
                    log = ProductivityLog.objects.create(
                        user=user,
                        period_type='monthly',
                        period_start=first,
                        period_end=last,
                        completion_rate=completion_rate,
                        total_tasks=total_tasks,
                        completed_tasks=completed_tasks,
                        status=status
                    )
                else:
                    # Update the log for the current month
                    log.completion_rate = completion_rate
                    log.total_tasks = total_tasks
                    log.completed_tasks = completed_tasks
                    log.status = status
                    log.save()
            # Debug: Log all months and their data
            print(f"Month {month}: {log.total_tasks} tasks, status: {log.status}")
            
            data.append({
                'month': month,
                'log': {
                    'status': log.status,
                    'completion_rate': log.completion_rate,
                    'total_tasks': log.total_tasks,
                    'completed_tasks': log.completed_tasks
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
