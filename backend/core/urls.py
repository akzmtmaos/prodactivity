# core/urls.py (root)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from notes.views import deleted_notes
from decks.views import deleted_decks
from reviewer.ai_views import deleted_reviewers
from core.admin import admin_site
from core.views import NotificationListView, NotificationCreateView, NotificationMarkReadView, HealthCheckView, SendShareEmailView

urlpatterns = [
    path('', HealthCheckView.as_view(), name='health-check'),
    path('admin/', admin_site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('accounts.urls')),
    path('api/notes/', include('notes.urls')),
    path('api/decks/', include('decks.urls')),
    path('api/', include('tasks.urls')),
    path('api/terms/', include('core.terms_urls')),
    path('api/reviewers/', include('reviewer.urls')),
    path('api/notifications/', NotificationListView.as_view(), name='notification-list'),
    path('api/notifications/create/', NotificationCreateView.as_view(), name='notification-create'),
    path('api/notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('api/collaboration/send-share-email/', SendShareEmailView.as_view(), name='send-share-email'),
    # Trash endpoints
    path('api/trash/notes/', deleted_notes, name='deleted-notes'),
    path('api/trash/decks/', deleted_decks, name='deleted-decks'),
    path('api/trash/reviewers/', deleted_reviewers, name='deleted-reviewers'),
    path('api/progress/', include('progress.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
