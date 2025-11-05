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
from .supabase_sync import update_user_in_supabase, check_user_exists_in_supabase

def validate_username(username):
    """Validate username format and length"""
    if not username:
        return False, "Username is required"
    
    if len(username) > 50:
        return False, "Username must be 50 characters or less"
    
    # Check for special characters (only allow letters, numbers, and underscores)
    # Since we convert to lowercase, we only need to check lowercase pattern
    if not re.match(r'^[a-z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    
    return True, ""

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one capital letter"
    
    if not re.search(r'[!@#$%^&*()_+\-=[\]{};\':"\\|,.<>/?]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""

@api_view(['POST'])
def register(request):
    data = request.data
    username = data.get('username', '').lower()  # Convert to lowercase
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

    # Check for existing email BEFORE creating user
    if User.objects.filter(email=email).exists():
        return Response({'success': False, 'message': 'Email is already registered'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for existing username BEFORE creating user
    if User.objects.filter(username=username).exists():
        return Response({'success': False, 'message': 'Username is already taken'}, status=status.HTTP_400_BAD_REQUEST)

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

    print(f"Login attempt - Email: {email}")
    print(f"Request data: {request.data}")

    if email is None or password is None:
        return Response({'message': 'Email and password required.'}, status=400)

    try:
        # Try case-insensitive email matching first
        email_lower = email.lower().strip()
        user = User.objects.filter(email__iexact=email_lower).first()
        
        # If not found, try exact match (for backward compatibility)
        if not user:
            user = User.objects.filter(email=email).first()
        
        print(f"User found: {user}")
        print(f"Total users in database: {User.objects.count()}")
        if not user:
            print("No user found with this email")
            # Check if there are any users at all
            all_users = User.objects.all()[:5]
            print(f"Sample users in database: {[u.email for u in all_users]}")
            return Response({'message': 'Invalid credentials'}, status=401)
    except Exception as e:
        print(f"Exception finding user: {e}")
        import traceback
        print(traceback.format_exc())
        return Response({'message': 'Invalid credentials'}, status=401)

    print(f"Checking password for user: {user.username}")
    print(f"Password received: '{password}'")
    print(f"Password length: {len(password)}")
    print(f"User is_active: {user.is_active}")
    print(f"User has profile: {hasattr(user, 'profile')}")
    if hasattr(user, 'profile'):
        print(f"Profile email_verified: {user.profile.email_verified}")
    
    if user.check_password(password):
        print("Password is correct!")
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
                'date_joined': user.date_joined,
            },
        })
    else:
        print("Password is incorrect!")
        return Response({'message': 'Invalid credentials'}, status=401)

@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    user = request.user
    if 'avatar' in request.FILES:
        user.profile.avatar = request.FILES['avatar']
        user.profile.save()
        
        # Return the avatar URL
        avatar_url = None
        if user.profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{user.profile.avatar.url}"
        
        return Response({
            'message': 'Avatar updated successfully',
            'avatar': avatar_url
        })
    return Response({'message': 'No avatar file provided'}, status=400)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    
    if request.method == 'PATCH':
        # Update user profile
        data = request.data
        
        # Update username if provided
        if 'username' in data:
            new_username = data['username'].lower().strip()
            if new_username != user.username:
                # Validate username
                is_valid, error_msg = validate_username(new_username)
                if not is_valid:
                    return Response({'success': False, 'message': error_msg}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if username is already taken
                if User.objects.filter(username=new_username).exclude(id=user.id).exists():
                    return Response({'success': False, 'message': 'Username is already taken'}, status=status.HTTP_400_BAD_REQUEST)
                
                user.username = new_username
        
        # Update email if provided
        if 'email' in data:
            new_email = data['email'].strip()
            if new_email != user.email:
                # Check if email is already taken
                if User.objects.filter(email=new_email).exclude(id=user.id).exists():
                    return Response({'success': False, 'message': 'Email is already registered'}, status=status.HTTP_400_BAD_REQUEST)
                
                user.email = new_email
                # Mark email as unverified when changed
                if hasattr(user, 'profile'):
                    user.profile.email_verified = False
                    user.profile.save()
        
        # Update profile fields if provided
        if hasattr(user, 'profile'):
            if 'displayName' in data:
                user.profile.display_name = data['displayName']
            if 'bio' in data:
                user.profile.bio = data['bio']
            if 'phone' in data:
                user.profile.phone = data['phone']
            if 'dob' in data:
                user.profile.date_of_birth = data['dob']
            if 'location' in data:
                user.profile.location = data['location']
            
            user.profile.save()
        
        user.save()
        
        # Sync to Supabase
        if hasattr(user, 'profile'):
            try:
                if check_user_exists_in_supabase(user.id):
                    update_user_in_supabase(user, user.profile)
                    print(f"✅ Synced username update to Supabase for user {user.id}")
                else:
                    print(f"⚠️ User {user.id} not found in Supabase, skipping sync")
            except Exception as e:
                print(f"❌ Failed to sync to Supabase: {e}")
        
        # Return updated user data
        avatar_url = None
        if hasattr(user, 'profile') and user.profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{user.profile.avatar.url}"
        
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'displayName': getattr(user.profile, 'display_name', '') if hasattr(user, 'profile') else '',
                'bio': getattr(user.profile, 'bio', '') if hasattr(user, 'profile') else '',
                'phone': getattr(user.profile, 'phone', '') if hasattr(user, 'profile') else '',
                'dob': getattr(user.profile, 'date_of_birth', '') if hasattr(user, 'profile') else '',
                'location': getattr(user.profile, 'location', '') if hasattr(user, 'profile') else '',
                'avatar': avatar_url,
                'email_verified': getattr(user.profile, 'email_verified', False) if hasattr(user, 'profile') else False,
                'date_joined': user.date_joined,
            }
        })
    
    # GET request - return user data
    avatar_url = None
    if hasattr(user, 'profile') and user.profile.avatar:
        request_scheme = request.scheme
        request_host = request.get_host()
        avatar_url = f"{request_scheme}://{request_host}{user.profile.avatar.url}"
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'displayName': getattr(user.profile, 'display_name', '') if hasattr(user, 'profile') else '',
        'bio': getattr(user.profile, 'bio', '') if hasattr(user, 'profile') else '',
        'phone': getattr(user.profile, 'phone', '') if hasattr(user, 'profile') else '',
        'dob': getattr(user.profile, 'date_of_birth', '') if hasattr(user, 'profile') else '',
        'location': getattr(user.profile, 'location', '') if hasattr(user, 'profile') else '',
        'avatar': avatar_url,
        'email_verified': getattr(user.profile, 'email_verified', False) if hasattr(user, 'profile') else False,
        'date_joined': user.date_joined,
    })

# Password verification endpoint (for delete account confirmation)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_password(request):
    password = request.data.get('password')
    
    if not password:
        return Response({'detail': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if the password is correct
    user = request.user
    if user.check_password(password):
        return Response({'success': True, 'message': 'Password verified'}, status=status.HTTP_200_OK)
    else:
        return Response({'detail': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)

# Delete account endpoint
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    password = request.data.get('password')
    
    if not password:
        return Response({'detail': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    
    # Verify password again before deletion
    if not user.check_password(password):
        return Response({'detail': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Delete the user account (this will cascade delete related data)
        username = user.username
        user.delete()
        
        return Response({
            'success': True,
            'message': f'Account {username} has been permanently deleted'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'detail': f'Failed to delete account: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    
    email = request.data.get('email', '').strip()
    
    # Check for empty email
    if not email:
        return Response({'detail': 'Email is required'}, status=400)
    
    # Validate email format
    try:
        validate_email(email)
    except ValidationError:
        return Response({'detail': 'Please enter a valid email address'}, status=400)
    
    user = User.objects.filter(email=email).first()
    # Don't reveal whether email exists (only for valid email formats)
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
    
    # Validate password strength
    is_valid_password, password_error = validate_password(new_password)
    if not is_valid_password:
        return Response({'detail': password_error}, status=400)
    
    user_id = get_user_from_token(token, 'password_reset')
    if not user_id:
        return Response({'detail': 'Invalid or expired token'}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        user.set_password(new_password)
        user.save()
        
        # Delete token after successful password reset
        delete_verification_token(token, 'password_reset')
        
        return Response({'detail': 'Password has been reset successfully.'})
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for authenticated user"""
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({'detail': 'Current password and new password are required'}, status=400)
    
    # Validate current password
    if not request.user.check_password(current_password):
        return Response({'detail': 'Current password is incorrect'}, status=400)
    
    # Validate new password strength
    is_valid_password, password_error = validate_password(new_password)
    if not is_valid_password:
        return Response({'detail': password_error}, status=400)
    
    # Set new password
    request.user.set_password(new_password)
    request.user.save()
    
    return Response({'detail': 'Password changed successfully'})