from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError
import re
from datetime import datetime
from django.utils import timezone

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
from core.email_utils import (
    send_verification_email, 
    send_password_reset_email, 
    generate_verification_token,
    store_verification_token,
    get_user_from_token,
    delete_verification_token,
    is_email_configured
)

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
        user.is_active = not settings.EMAIL_VERIFICATION_REQUIRED  # Deactivate if email verification required
        user.save()
        
        # Send verification email if required
        if settings.EMAIL_VERIFICATION_REQUIRED and is_email_configured():
            token = generate_verification_token()
            store_verification_token(token, user.id, 'verification')
            send_verification_email(user, token)
            message = 'Account created successfully! Please check your email to verify your account.'
        else:
            message = 'Account created successfully!'
        
        return Response({
            'success': True, 
            'message': message,
            'email_verification_required': settings.EMAIL_VERIFICATION_REQUIRED and is_email_configured()
        }, status=status.HTTP_201_CREATED)
    except IntegrityError:
        if User.objects.filter(username=username).exists():
            return Response({'success': False, 'message': 'Username is already taken'}, status=status.HTTP_400_BAD_REQUEST)
        elif User.objects.filter(email=email).exists():
            return Response({'success': False, 'message': 'Email is already registered'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'success': False, 'message': 'Registration failed'}, status=status.HTTP_400_BAD_REQUEST)

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
        # Check if email verification is required and user is not verified
        if settings.EMAIL_VERIFICATION_REQUIRED and not user.profile.email_verified:
            return Response({
                'message': 'Please verify your email address before logging in.',
                'email_verification_required': True
            }, status=401)
        
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
                'email_verified': user.profile.email_verified,
            },
        })
    else:
        return Response({'message': 'Invalid credentials'}, status=401)

@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    user = request.user
    if 'avatar' in request.FILES:
        user.profile.avatar = request.FILES['avatar']
        user.profile.save()
        return Response({'message': 'Avatar updated successfully'})
    return Response({'message': 'No avatar file provided'}, status=400)

# Email verification endpoint
@api_view(['POST'])
def verify_email(request):
    token = request.data.get('token')
    if not token:
        return Response({'detail': 'Token is required'}, status=400)
    
    user_id = get_user_from_token(token, 'verification')
    if not user_id:
        return Response({'detail': 'Invalid or expired verification token'}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        user.profile.email_verified = True
        user.profile.email_verified_at = timezone.now()
        user.profile.save()
        
        # Activate user if they were inactive due to email verification requirement
        if not user.is_active:
            user.is_active = True
            user.save()
        
        # Delete token after successful verification
        delete_verification_token(token, 'verification')
        
        return Response({'detail': 'Email verified successfully. You can now log in.'})
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=404)

# Resend verification email
@api_view(['POST'])
def resend_verification(request):
    email = request.data.get('email')
    if not email:
        return Response({'detail': 'Email is required'}, status=400)
    
    user = User.objects.filter(email=email).first()
    if user and not user.profile.email_verified:
        if is_email_configured():
            token = generate_verification_token()
            store_verification_token(token, user.id, 'verification')
            send_verification_email(user, token)
            return Response({'detail': 'Verification email sent successfully.'})
        else:
            return Response({'detail': 'Email service not configured.'}, status=500)
    
    # Don't reveal whether email exists
    return Response({'detail': 'If an account exists for that email, a verification link has been sent.'})

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
    if user and is_email_configured():
        token = generate_verification_token()
        store_verification_token(token, user.id, 'password_reset')
        send_password_reset_email(user, token)
    
    return Response({'detail': 'If an account exists for that email, a reset link has been sent.'})

@api_view(['POST'])
def password_reset_confirm(request):
    token = request.data.get('token')
    new_password = request.data.get('password')
    if not token or not new_password:
        return Response({'detail': 'Token and new password are required'}, status=400)
    
    user_id = get_user_from_token(token, 'password_reset')
    if not user_id:
        return Response({'detail': 'Invalid or expired token'}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password has been reset successfully.'})
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=404)