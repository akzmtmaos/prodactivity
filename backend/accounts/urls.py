from django.urls import path
from .views import register
from .views import login_view
from .views import update_avatar
from .views import password_reset_request, password_reset_confirm

urlpatterns = [
    path('register/', register, name='register'),
    path('login/', login_view, name='login'),
    path('avatar/', update_avatar, name='update_avatar'),
    path('password-reset/', password_reset_request, name='password_reset'),
    path('password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
]
