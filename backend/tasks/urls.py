from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SubtaskViewSet, StudyTimerSessionViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'subtasks', SubtaskViewSet, basename='subtask')
# Register study-timer-sessions under tasks/ prefix to match frontend expectations
router.register(r'tasks/study-timer-sessions', StudyTimerSessionViewSet, basename='study-timer-session')

urlpatterns = [
    path('', include(router.urls)),
] 