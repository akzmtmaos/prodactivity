from django.urls import path
from .views import register
from .views import login_view
from .views import update_avatar
from .views import password_reset_request, password_reset_confirm, change_password
from .views import verify_email, resend_verification
from .views import me, verify_password, delete_account
from .views import recover_account
from .views import admin_sync_profiles

urlpatterns = [
    path('register/', register, name='register'),
    path('login/', login_view, name='login'),
    path('avatar/', update_avatar, name='update_avatar'),
    path('password-reset/', password_reset_request, name='password_reset'),
    path('password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
    path('change-password/', change_password, name='change_password'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
    path('me/', me, name='me'),
    path('verify-password/', verify_password, name='verify_password'),
    path('delete-account/', delete_account, name='delete_account'),
    path('recover-account/', recover_account, name='recover_account'),
    path('admin/sync-profiles/', admin_sync_profiles, name='admin_sync_profiles'),
]
