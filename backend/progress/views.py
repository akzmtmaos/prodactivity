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

    # Calculate streak: consecutive days with tasks and at least one completed task
    streak = 0
    today = timezone.localdate()
    day = today
    while True:
        # Only count past and current dates, not future dates
        if day > today:
            day -= timedelta(days=1)
            continue
            
        # Check if there were tasks on this day AND at least one was completed
        daily_tasks = tasks.filter(due_date=day)
        daily_completed = completed_tasks.filter(due_date=day)
        
        if daily_tasks.exists() and daily_completed.exists():
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
    user = request.user
    
    # Get the last 365 days of productivity data
    from datetime import datetime, timedelta
    from tasks.models import Task
    
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=365)
    
    streak_data = []
    current_date = start_date
    
    while current_date <= end_date:
        # Check if user had productive day (completed tasks)
        daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
        daily_non_deleted = daily_tasks.filter(is_deleted=False)
        daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
        
        daily_total = daily_non_deleted.count() + daily_deleted_completed.count()
        daily_completed = daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
        
        # Consider it a streak day if there were tasks and at least one was completed
        # But only for past and current dates, not future dates
        today = timezone.now().date()
        is_future_date = current_date > today
        
        if is_future_date:
            has_streak = False
            productivity_rate = 0
        else:
            has_streak = daily_total > 0 and daily_completed > 0
            productivity_rate = (daily_completed / daily_total * 100) if daily_total > 0 else 0
        
        streak_data.append({
            'date': current_date.isoformat(),
            'streak': has_streak,
            'productivity': round(productivity_rate, 2) if has_streak else 0,
            'total_tasks': daily_total,
            'completed_tasks': daily_completed
        })
        
        current_date += timedelta(days=1)
    
    return Response(streak_data)

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
    
    # Use local time (system timezone) to match task creation logic
    today = timezone.now().date()

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
    if view == 'daily':
        # NEW LOGIC: Count tasks by when they were actually worked on
        # - Completed tasks: count by completed_at date (when work was done)
        # - Pending tasks: count by due_date (when they're scheduled)
        
        # Get completed tasks that were completed on this day (regardless of due date)
        completed_on_this_day = Task.all_objects.filter(
            user=user,
            completed=True,
            is_deleted=False,
            completed_at__date=start  # Match completion date
        )
        
        # Get tasks that are due today but not yet completed (to show in total)
        pending_due_today = Task.all_objects.filter(
            user=user,
            due_date=start,
            completed=False,
            is_deleted=False
        )
        
        # Get deleted tasks that were completed on this day
        deleted_completed_on_this_day = Task.all_objects.filter(
            user=user,
            is_deleted=True,
            was_completed_on_delete=True,
            completed_at__date=start
        )
        
        total_tasks = completed_on_this_day.count() + pending_due_today.count() + deleted_completed_on_this_day.count()
        completed_tasks = completed_on_this_day.count() + deleted_completed_on_this_day.count()
        
        # DEBUG: Print calculation values
        print(f"[DEBUG] Daily calculation for {start} to {end}:")
        print(f"[DEBUG] Total tasks: {total_tasks}")
        print(f"[DEBUG] Completed tasks: {completed_tasks}")
        print(f"[DEBUG] Non-deleted count: {non_deleted.count()}")
        print(f"[DEBUG] Deleted completed count: {deleted_completed.count()}")
        print(f"[DEBUG] Non-deleted completed: {non_deleted.filter(completed=True).count()}")
    else:
        # For weekly and monthly views, aggregate daily productivity data
        # This gives a more accurate picture by using daily completion rates
        if view == 'weekly':
            # Calculate weekly percentage as average of daily percentages
            daily_percentages = []
            current_date = start
            while current_date <= end:
                daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
                daily_non_deleted = daily_tasks.filter(is_deleted=False)
                daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
                
                daily_total = daily_non_deleted.count() + daily_deleted_completed.count()
                daily_completed = daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
                
                if daily_total > 0:
                    daily_percentage = (daily_completed / daily_total) * 100
                else:
                    daily_percentage = 0  # No tasks = 0% productivity
                
                daily_percentages.append(daily_percentage)
                current_date += timedelta(days=1)
            
            # Calculate average of daily percentages
            if daily_percentages:
                completion_rate = sum(daily_percentages) / len(daily_percentages)
                # For display purposes, we'll show the average percentage
                # but we need to calculate total tasks for the response
                total_tasks = 0
                completed_tasks = 0
                current_date = start
                while current_date <= end:
                    daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
                    daily_non_deleted = daily_tasks.filter(is_deleted=False)
                    daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
                    
                    total_tasks += daily_non_deleted.count() + daily_deleted_completed.count()
                    completed_tasks += daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
                    current_date += timedelta(days=1)
            else:
                completion_rate = 0
                total_tasks = 0
                completed_tasks = 0
        
        elif view == 'monthly':
            # Calculate monthly percentage as average of daily percentages
            daily_percentages = []
            current_date = start
            while current_date <= end:
                daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
                daily_non_deleted = daily_tasks.filter(is_deleted=False)
                daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
                
                daily_total = daily_non_deleted.count() + daily_deleted_completed.count()
                daily_completed = daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
                
                if daily_total > 0:
                    daily_percentage = (daily_completed / daily_total) * 100
                else:
                    daily_percentage = 0  # No tasks = 0% productivity
                
                daily_percentages.append(daily_percentage)
                current_date += timedelta(days=1)
            
            # Calculate average of daily percentages
            if daily_percentages:
                completion_rate = sum(daily_percentages) / len(daily_percentages)
                # For display purposes, we'll show the average percentage
                # but we need to calculate total tasks for the response
                total_tasks = 0
                completed_tasks = 0
                current_date = start
                while current_date <= end:
                    daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
                    daily_non_deleted = daily_tasks.filter(is_deleted=False)
                    daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
                    
                    total_tasks += daily_non_deleted.count() + daily_deleted_completed.count()
                    completed_tasks += daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
                    current_date += timedelta(days=1)
            else:
                completion_rate = 0
                total_tasks = 0
                completed_tasks = 0
    
    print(f"[DEBUG] Productivity endpoint - Today (local): {today}")
    print(f"[DEBUG] Productivity endpoint - Start: {start}, End: {end}")
    print(f"[DEBUG] Productivity endpoint - View: {view}")
    print(f"[DEBUG] Productivity endpoint - Total tasks found: {total_tasks}")
    print(f"[DEBUG] Productivity endpoint - Completed tasks: {completed_tasks}")
    print(f"[DEBUG] Productivity endpoint - Is current period: {is_current_period}")
    
    if total_tasks == 0:
        completion_rate = 0
        status = 'No Tasks'
    else:
        # For weekly and monthly views, use the average of daily percentages
        # For daily view, use the traditional calculation
        if view in ['weekly', 'monthly']:
            # completion_rate is already calculated as average of daily percentages above
            pass
        else:
            # For daily view, use traditional calculation
            completion_rate = completed_tasks / total_tasks * 100
            print(f"[DEBUG] Daily completion rate calculation: {completed_tasks} / {total_tasks} * 100 = {completion_rate:.2f}%")
        
        if completion_rate >= 90:
            status = 'Highly Productive'
        elif completion_rate >= 70:
            status = 'Productive'
        elif completion_rate >= 40:
            status = 'Moderately Productive'
        else:
            status = 'Low Productive'
    
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
    from tasks.models import ProductivityLog, Task
    from django.utils import timezone
    from datetime import datetime, timedelta, date
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
    
    # MANUAL CLEANUP: Force delete ALL monthly logs to recalculate from daily logs
    if view == 'monthly':
        deleted_count = ProductivityLog.objects.filter(
            user=user,
            period_type='monthly'
        ).delete()[0]
        print(f"[DEBUG] MANUALLY DELETED ALL {deleted_count} monthly logs for user {user.username}")
        print(f"[DEBUG] All monthly logs will be recalculated from daily logs")
    
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
                # NEW LOGIC: Count by work date (completed_at) not just due_date
                completed_on_this_day = Task.all_objects.filter(
                    user=user,
                    completed=True,
                    is_deleted=False,
                    completed_at__date=d
                )
                pending_due_today = Task.all_objects.filter(
                    user=user,
                    due_date=d,
                    completed=False,
                    is_deleted=False
                )
                deleted_completed_on_this_day = Task.all_objects.filter(
                    user=user,
                    is_deleted=True,
                    was_completed_on_delete=True,
                    completed_at__date=d
                )
                
                total_tasks = completed_on_this_day.count() + pending_due_today.count() + deleted_completed_on_this_day.count()
                completed_tasks = completed_on_this_day.count() + deleted_completed_on_this_day.count()
                
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
                        status = 'Moderately Productive'
                    else:
                        status = 'Low Productive'
                
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
                'date': d.strftime('%Y-%m-%d'),
                'log': {
                    'status': log.status,
                    'completion_rate': log.completion_rate,
                    'total_tasks': log.total_tasks,
                    'completed_tasks': log.completed_tasks
                }
            })
    elif view == 'weekly':
        # List all weeks in the year
        year = base_date.year
        today = timezone.localdate()
        
        # Calculate all weeks in the year
        from datetime import timedelta
        
        # Get the first day of the year
        first_day = datetime(year, 1, 1).date()
        # Get the last day of the year
        last_day = datetime(year, 12, 31).date()
        
        # Generate all weeks in the year
        current_date = first_day
        while current_date <= last_day:
            # Calculate week start (Monday) and week end (Sunday)
            days_since_monday = current_date.weekday()
            week_start = current_date - timedelta(days=days_since_monday)
            week_end = week_start + timedelta(days=6)
            
            # Check if we already have a log for this week
            log = ProductivityLog.objects.filter(
                user=user, 
                period_type='weekly', 
                period_start=week_start, 
                period_end=week_end
            ).first()
            
            # If no log exists for this week, create one using average of daily percentages
            if not log:
                # Calculate weekly percentage as average of daily percentages
                daily_percentages = []
                total_tasks = 0
                completed_tasks = 0
                current_date = week_start
                
                while current_date <= week_end:
                    daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
                    daily_non_deleted = daily_tasks.filter(is_deleted=False)
                    daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
                    
                    daily_total = daily_non_deleted.count() + daily_deleted_completed.count()
                    daily_completed = daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
                    
                    if daily_total > 0:
                        daily_percentage = (daily_completed / daily_total) * 100
                    else:
                        daily_percentage = 0  # No tasks = 0% productivity
                    
                    daily_percentages.append(daily_percentage)
                    total_tasks += daily_total
                    completed_tasks += daily_completed
                    current_date += timedelta(days=1)
                
                # Calculate average of daily percentages
                if daily_percentages:
                    completion_rate = sum(daily_percentages) / len(daily_percentages)
                else:
                    completion_rate = 0
                
                if completion_rate >= 90:
                    status = 'Highly Productive'
                elif completion_rate >= 70:
                    status = 'Productive'
                elif completion_rate >= 40:
                    status = 'Moderately Productive'
                else:
                    status = 'Low Productive'
                
                # Create the weekly log
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
                print(f"[DEBUG] Created weekly log for {week_start} to {week_end}: {completion_rate:.2f}% (average of daily percentages)")
            
            # Move to next week
            current_date = week_end + timedelta(days=1)
        
        # Get all weekly logs for this year (including newly created ones)
        all_logs = ProductivityLog.objects.filter(
            user=user,
            period_type='weekly',
            period_start__year=year
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
            
            if has_tasks or is_recent:
                data.append({
                    'week_start': week_start.strftime('%Y-%m-%d'),
                    'week_end': week_end.strftime('%Y-%m-%d'),
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
        
        # Generate all months in the year
        for month in range(1, 13):  # January to December
            # Calculate month start and end dates
            month_start = datetime(year, month, 1).date()
            if month == 12:
                month_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                month_end = datetime(year, month + 1, 1).date() - timedelta(days=1)
            
            # Check if we already have a log for this month
            log = ProductivityLog.objects.filter(
                user=user, 
                period_type='monthly', 
                period_start=month_start, 
                period_end=month_end
            ).first()
            
            # If no log exists for this month, create one using average of daily percentages
            if not log:
                # Calculate monthly percentage as average of daily percentages
                daily_percentages = []
                total_tasks = 0
                completed_tasks = 0
                current_date = month_start
                
                while current_date <= month_end:
                    daily_tasks = Task.all_objects.filter(user=user, due_date=current_date)
                    daily_non_deleted = daily_tasks.filter(is_deleted=False)
                    daily_deleted_completed = daily_tasks.filter(is_deleted=True, was_completed_on_delete=True)
                    
                    daily_total = daily_non_deleted.count() + daily_deleted_completed.count()
                    daily_completed = daily_non_deleted.filter(completed=True).count() + daily_deleted_completed.count()
                    
                    if daily_total > 0:
                        daily_percentage = (daily_completed / daily_total) * 100
                    else:
                        daily_percentage = 0  # No tasks = 0% productivity
                    
                    daily_percentages.append(daily_percentage)
                    total_tasks += daily_total
                    completed_tasks += daily_completed
                    current_date += timedelta(days=1)
                
                # Calculate average of daily percentages
                if daily_percentages:
                    completion_rate = sum(daily_percentages) / len(daily_percentages)
                else:
                    completion_rate = 0
                
                if completion_rate >= 90:
                    status = 'Highly Productive'
                elif completion_rate >= 70:
                    status = 'Productive'
                elif completion_rate >= 40:
                    status = 'Moderately Productive'
                else:
                    status = 'Low Productive'
                
                # Create the monthly log
                log = ProductivityLog.objects.create(
                    user=user,
                    period_type='monthly',
                    period_start=month_start,
                    period_end=month_end,
                    completion_rate=completion_rate,
                    total_tasks=total_tasks,
                    completed_tasks=completed_tasks,
                    status=status
                )
                print(f"[DEBUG] Created monthly log for {month_start.strftime('%B %Y')}: {completion_rate:.2f}% (average of daily percentages)")
        
        # Get all monthly logs for this year (including newly created ones)
        all_logs = ProductivityLog.objects.filter(
            user=user,
            period_type='monthly',
            period_start__year=year
        ).order_by('-period_start')  # Most recent first
        
        # Process all logs for the response
        for log in all_logs:
            month = log.period_start.month
            
            # Debug: Log all months and their data
            print(f"Month {month}: {log.total_tasks} tasks, status: {log.status}")
            
            # Only include months that have tasks or are recent
            today = timezone.localdate()
            is_recent = (today - log.period_end).days <= 90  # Within last 3 months
            has_tasks = log.total_tasks > 0
            
            if has_tasks or is_recent:
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
