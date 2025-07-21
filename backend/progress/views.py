from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from tasks.models import Task
from decks.models import QuizSession
from django.utils import timezone
from datetime import timedelta

# Create your views here.

@login_required
def user_stats(request):
    user = request.user
    tasks = Task.objects.filter(user=user)
    completed_tasks = tasks.filter(completed=True)
    total_tasks_completed = completed_tasks.count()
    total_study_time = completed_tasks.filter(category='study').count()  # Proxy: 1 study task = 1 unit time
    total_tasks = tasks.count()
    average_productivity = int((total_tasks_completed / total_tasks) * 100) if total_tasks > 0 else 0

    # Calculate streak: consecutive days with at least one completed task
    streak = 0
    today = timezone.now().date()
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
    return JsonResponse(data)

@login_required
def user_level(request):
    user = request.user
    tasks = Task.objects.filter(user=user, completed=True)
    xp_from_tasks = tasks.count() * 10
    xp_from_study = tasks.filter(category='study').count() * 1
    # Add XP from completed QuizSessions
    quiz_sessions = QuizSession.objects.filter(user=user)
    xp_from_quizzes = quiz_sessions.count() * 20
    total_xp = xp_from_tasks + xp_from_study + xp_from_quizzes
    current_level = (total_xp // 1000) + 1
    xp_to_next_level = 1000
    current_xp = total_xp % 1000
    data = {
        'currentLevel': current_level,
        'currentXP': current_xp,
        'xpToNextLevel': xp_to_next_level
    }
    return JsonResponse(data)

@login_required
def user_streaks(request):
    # TODO: Implement real streak calendar data
    data = [
        {'date': '2024-06-01', 'completed': True},
        # ...
    ]
    return JsonResponse(data, safe=False)

@login_required
def user_chart(request):
    view = request.GET.get('view', 'weekly')
    # TODO: Implement real chart data based on 'view'
    data = {}
    return JsonResponse(data)
