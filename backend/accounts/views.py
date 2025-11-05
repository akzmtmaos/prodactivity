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
from .supabase_sync import update_user_in_supabase, check_user_exists_in_supabase, get_user_from_supabase_by_email

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
    print(f"Registration attempt - Email: {email}, Username: {username}")
    print(f"Checking if email exists: {User.objects.filter(email=email).exists()}")
    print(f"Checking if username exists: {User.objects.filter(username=username).exists()}")
    
    if User.objects.filter(email=email).exists():
        print(f"Email {email} already exists!")
        return Response({'success': False, 'message': 'Email is already registered'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for existing username BEFORE creating user
    if User.objects.filter(username=username).exists():
        print(f"Username {username} already exists!")
        return Response({'success': False, 'message': 'Username is already taken'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        print(f"Creating user with email: {email}, username: {username}")
        user = User.objects.create_user(username=username, email=email, password=password)
        print(f"User created successfully! User ID: {user.id}, Username: {user.username}, Email: {user.email}")
        
        user.is_active = not settings.EMAIL_VERIFICATION_REQUIRED  # Deactivate if email verification required
        user.save()
        
        # Verify user was saved
        saved_user = User.objects.filter(email=email).first()
        print(f"Verification - User in database: {saved_user}")
        print(f"Total users in database: {User.objects.count()}")
        
        # Send verification email if required
        if settings.EMAIL_VERIFICATION_REQUIRED and is_email_configured():
            token = generate_verification_token()
            store_verification_token(token, user.id, 'verification')
            send_verification_email(user, token)
            message = 'Account created successfully! Please check your email to verify your account.'
        else:
            message = 'Account created successfully!'
        
        print(f"Registration successful for user: {user.username}")
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
            print("No user found with this email in Django database")
            # Check if there are any users at all
            all_users = User.objects.all()[:5]
            print(f"Sample users in database: {[u.email for u in all_users]}")
            
            # Check if user exists in Supabase but not in Django
            print(f"Checking if user exists in Supabase...")
            supabase_user = get_user_from_supabase_by_email(email_lower)
            if supabase_user:
                print(f"⚠️ User found in Supabase but NOT in Django database!")
                print(f"Supabase user data: {supabase_user}")
                return Response({
                    'message': 'Account exists in Supabase but not in Django. Please reset your password or contact support.',
                    'error_code': 'USER_IN_SUPABASE_NOT_DJANGO'
                }, status=401)
            
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

# Account recovery endpoint: Recreate Django user from Supabase
@api_view(['POST'])
@throttle_classes([AnonRateThrottle])
def recover_account(request):
    """
    Recover account that exists in Supabase but not in Django.
    Creates Django user from Supabase data.
    Optionally accepts password to set directly, otherwise sends password reset email.
    """
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '').strip()  # Optional: allow setting password directly
    
    print(f"🔍 Recovery request received - Email: '{email}', Has password: {bool(password)}")
    print(f"📦 Request data: {request.data}")
    
    if not email:
        print(f"❌ Email is missing or empty")
        return Response({'detail': 'Email is required'}, status=400)
    
    # Check if user already exists in Django
    django_user = User.objects.filter(email__iexact=email).first()
    if django_user:
        print(f"✅ User already exists in Django: {django_user.username} (ID: {django_user.id})")
        
        # If password is provided, update it
        if password:
            print(f"🔑 Updating password for existing user...")
            # Validate password strength
            is_valid_password, password_error = validate_password(password)
            if not is_valid_password:
                return Response({'detail': password_error}, status=400)
            
            django_user.set_password(password)
            django_user.save()
            print(f"✅ Password updated successfully!")
            
            return Response({
                'success': True,
                'detail': 'Account found and password updated! You can now log in with your email and password.',
                'message': 'Password updated. You can log in now.',
                'user_id': django_user.id,
                'username': django_user.username
            })
        
        return Response({
            'success': True,
            'detail': 'Account already exists in Django. If you cannot log in, please use the password reset feature.',
            'message': 'Account already exists. Please use the login page or password reset.',
            'error_code': 'USER_EXISTS_IN_DJANGO'
        })
    
    # Check if user exists in Supabase
    print(f"🔍 Checking Supabase for user: {email}")
    supabase_user = get_user_from_supabase_by_email(email.lower())
    
    if not supabase_user:
        print(f"❌ User not found in Supabase")
        # Don't reveal whether email exists
        return Response({
            'detail': 'If an account exists for that email, a recovery link has been sent.',
            'error_code': 'USER_NOT_FOUND'
        })
    
    print(f"✅ Found user in Supabase: {supabase_user}")
    print(f"📦 Supabase user data: {list(supabase_user.keys())}")
    
    # Create Django user from Supabase data
    try:
        # Get username from Supabase or generate from email
        username = supabase_user.get('username', email.split('@')[0])
        # Make sure username is unique
        base_username = username.lower()
        counter = 1
        while User.objects.filter(username=base_username).exists():
            base_username = f"{username.lower()}{counter}"
            counter += 1
        
        # Use provided password or generate temporary one
        if password:
            # Validate password strength
            is_valid_password, password_error = validate_password(password)
            if not is_valid_password:
                return Response({'detail': password_error}, status=400)
            user_password = password
            print(f"✅ Using provided password")
        else:
            # Generate a temporary random password (user will reset it)
            from django.utils.crypto import get_random_string
            user_password = get_random_string(32)
            print(f"✅ Generated temporary password")
        
        # Create Django user
        django_user = User.objects.create_user(
            username=base_username,
            email=email.lower(),
            password=user_password
        )
        
        print(f"✅ Created Django user: {django_user.username} (ID: {django_user.id})")
        
        # Sync all data from Supabase to Django Profile
        if hasattr(django_user, 'profile'):
            profile = django_user.profile
            
            # Sync email verification status
            if supabase_user.get('email_verified'):
                django_user.is_active = True
                profile.email_verified = True
                if supabase_user.get('email_verified_at'):
                    try:
                        from dateutil import parser
                        profile.email_verified_at = parser.parse(supabase_user['email_verified_at'])
                    except ImportError:
                        # Fallback to datetime parsing if dateutil not available
                        from datetime import datetime
                        profile.email_verified_at = datetime.fromisoformat(supabase_user['email_verified_at'].replace('Z', '+00:00'))
                    except Exception as e:
                        print(f"⚠️ Could not parse email_verified_at: {e}")
            
            # Sync date_joined if available
            if supabase_user.get('created_at'):
                try:
                    from dateutil import parser
                    django_user.date_joined = parser.parse(supabase_user['created_at'])
                except ImportError:
                    from datetime import datetime
                    django_user.date_joined = datetime.fromisoformat(supabase_user['created_at'].replace('Z', '+00:00'))
                except Exception as e:
                    print(f"⚠️ Could not parse created_at: {e}")
            
            profile.save()
            print(f"✅ Synced profile data from Supabase")
        
        django_user.save()
        print(f"✅ Saved Django user with all Supabase data")
        
        # If password was provided, user can log in immediately
        if password:
            return Response({
                'success': True,
                'detail': 'Account recovered successfully! You can now log in with your email and password.',
                'message': 'Account recovered. You can log in now.',
                'user_id': django_user.id,
                'username': django_user.username
            })
        
        # Otherwise, send password reset email
        if is_email_configured():
            token = generate_verification_token()
            store_verification_token(token, django_user.id, 'password_reset')
            send_password_reset_email(django_user, token)
            return Response({
                'success': True,
                'detail': 'Account recovered successfully! A password reset link has been sent to your email. Please check your inbox to set your password.',
                'message': 'Account recovered. Please check your email to set your password.'
            })
        else:
            return Response({
                'success': True,
                'detail': 'Account recovered successfully! However, email service is not configured. Please contact support to set your password.',
                'message': 'Account recovered but email not configured.'
            }, status=200)
            
    except Exception as e:
        print(f"❌ Error recovering account: {e}")
        import traceback
        print(traceback.format_exc())
        return Response({
            'detail': f'Failed to recover account: {str(e)}',
            'error_code': 'RECOVERY_FAILED'
        }, status=500)