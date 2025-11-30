from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SubtaskViewSet, StudyTimerSessionViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'subtasks', SubtaskViewSet, basename='subtask')

urlpatterns = [
    # Custom paths for study-timer-sessions (nested route that frontend expects) - MUST come before router.urls
    path('tasks/study-timer-sessions/', StudyTimerSessionViewSet.as_view({'get': 'list', 'post': 'create'}), name='study-timer-sessions-list'),
    path('tasks/study-timer-sessions/<int:pk>/', StudyTimerSessionViewSet.as_view({
        'get': 'retrieve', 
        'put': 'update', 
        'patch': 'partial_update', 
        'delete': 'destroy'
    }), name='study-timer-session-detail'),
    path('', include(router.urls)),  # Router URLs come after custom paths
] 