# core/urls.py (root)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/notes/', include('notes.urls')),
    path('api/decks/', include('decks.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
