from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.user_stats, name='user_stats'),
    path('level/', views.user_level, name='user_level'),
    path('streaks/', views.user_streaks, name='user_streaks'),
    path('chart/', views.user_chart, name='user_chart'),
] 