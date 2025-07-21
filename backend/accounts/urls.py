from django.urls import path
from .views import register
from .views import login_view
from .views import update_avatar

urlpatterns = [
    path('register/', register, name='register'),
    path('login/', login_view, name='login'),
    path('avatar/', update_avatar, name='update_avatar'),
]
