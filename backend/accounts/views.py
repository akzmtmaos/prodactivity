from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError
import re

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from .models import Profile
from .serializers import ProfileSerializer
from rest_framework.throttling import AnonRateThrottle
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.conf import settings

def validate_username(username):
    """Validate username format and length"""
    if not username:
        return False, "Username is required"
    
    if len(username) > 50:
        return False, "Username must be 50 characters or less"
    
    # Check for special characters (only allow letters, numbers, and underscores)
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    
    return True, ""

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one capital letter"
    
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""

@api_view(['POST'])
def register(request):
    data = request.data
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return Response({'success': False, 'message': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate username
    is_valid_username, username_error = validate_username(username)
    if not is_valid_username:
        return Response({'success': False, 'message': username_error}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password
    is_valid_password, password_error = validate_password(password)
    if not is_valid_password:
        return Response({'success': False, 'message': password_error}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()
        return Response({'success': True, 'message': 'Account created successfully!'}, status=status.HTTP_201_CREATED)
    except IntegrityError:
        return Response({'success': False, 'message': 'Username or email already exists'}, status=status.HTTP_400_BAD_REQUEST)


class LoginThrottle(AnonRateThrottle):
    rate = '10/minute'


@api_view(['POST'])
@throttle_classes([LoginThrottle])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if email is None or password is None:
        return Response({'message': 'Email and password required.'}, status=400)

    try:
        # Get the first user with this email (in case of duplicates)
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'message': 'Invalid credentials'}, status=401)
    except Exception:
        return Response({'message': 'Invalid credentials'}, status=401)

    if user.check_password(password):
        refresh = RefreshToken.for_user(user)
        avatar_url = None
        if hasattr(user, 'profile') and user.profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{user.profile.avatar.url}"
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'avatar': avatar_url,
            },
        })
    else:
        return Response({'message': 'Invalid credentials'}, status=401)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    user = request.user
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found.'}, status=404)
    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        avatar_url = None
        if profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{profile.avatar.url}"
        return Response({'avatar': avatar_url}, status=200)
    return Response(serializer.errors, status=400)


# Password reset request: generate token and send email
class PasswordResetThrottle(AnonRateThrottle):
    rate = '5/hour'


@api_view(['POST'])
@throttle_classes([PasswordResetThrottle])
def password_reset_request(request):
    email = request.data.get('email')
    if not email:
        return Response({'detail': 'Email is required'}, status=400)
    user = User.objects.filter(email=email).first()
    # Don't reveal whether email exists
    if user:
        token = get_random_string(32)
        cache_key = f"pwreset:{token}"
        cache.set(cache_key, user.id, timeout=60*60)  # 1 hour
        reset_url = f"{request.scheme}://{request.get_host()}/reset-password?token={token}"
        try:
            send_mail(
                subject='Password Reset Request',
                message=f'Use the link to reset your password: {reset_url}',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@prodactivity.local'),
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass
    return Response({'detail': 'If an account exists for that email, a reset link has been sent.'})


@api_view(['POST'])
def password_reset_confirm(request):
    token = request.data.get('token')
    new_password = request.data.get('password')
    if not token or not new_password:
        return Response({'detail': 'Token and new password are required'}, status=400)
    user_id = cache.get(f"pwreset:{token}")
    if not user_id:
        return Response({'detail': 'Invalid or expired token'}, status=400)
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({'detail': 'User not found'}, status=404)
    user.set_password(new_password)
    user.save()
    cache.delete(f"pwreset:{token}")
    return Response({'detail': 'Password has been reset successfully.'})