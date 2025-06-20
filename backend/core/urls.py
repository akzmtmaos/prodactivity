# core/urls.py (root)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('accounts.urls')),
    path('api/notes/', include('notes.urls')),
    path('api/decks/', include('decks.urls')),
    path('api/', include('tasks.urls')),
    path('api/terms/', include('core.terms_urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
