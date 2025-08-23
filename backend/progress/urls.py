from django.urls import path
from django.http import JsonResponse
from . import views

def progress_root(request):
    """Root view for progress app"""
    return JsonResponse({
        'message': 'Progress API is working!',
        'endpoints': [
            '/api/progress/stats/',
            '/api/progress/level/',
            '/api/progress/streaks/',
            '/api/progress/chart/',
            '/api/progress/productivity/',
            '/api/progress/productivity_logs/',
        ]
    })

urlpatterns = [
    path('', progress_root, name='progress_root'),
    path('stats/', views.user_stats, name='user_stats'),
    path('level/', views.user_level, name='user_level'),
    path('streaks/', views.user_streaks, name='user_streaks'),
    path('chart/', views.user_chart, name='user_chart'),
    path('productivity/', views.user_productivity, name='user_productivity'),
    path('debug_today_tasks/', views.debug_today_tasks, name='debug_today_tasks'),
    path('productivity_logs/', views.productivity_log_list, name='productivity_log_list'),
] 