from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.core.cache import cache
from django.utils.crypto import get_random_string
import logging

logger = logging.getLogger(__name__)

def send_verification_email(user, token):
    """
    Send email verification email to user
    """
    try:
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        
        # Render HTML email template
        html_message = render_to_string('email/email_verification.html', {
            'username': user.username,
            'email': user.email,
            'verification_url': verification_url,
            'site_name': settings.SITE_NAME,
            'token_expire_hours': settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS,
        })
        
        # Create plain text version
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=f'Verify Your Email - {settings.SITE_NAME}',
            message=plain_message,
            from_email=f"ProdActivity <{settings.EMAIL_HOST_USER}>",  # Use display name with Gmail address
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Verification email sent to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
        return False

def send_password_reset_email(user, token):
    """
    Send password reset email to user
    """
    try:
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        # Render HTML email template
        html_message = render_to_string('email/password_reset.html', {
            'username': user.username,
            'email': user.email,
            'reset_url': reset_url,
            'site_name': settings.SITE_NAME,
            'token_expire_hours': settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS,
        })
        
        # Create plain text version
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=f'Reset Your Password - {settings.SITE_NAME}',
            message=plain_message,
            from_email=f"ProdActivity <{settings.EMAIL_HOST_USER}>",  # Use display name with Gmail address
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Password reset email sent to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        return False

def generate_verification_token():
    """
    Generate a secure verification token
    """
    return get_random_string(32)

def store_verification_token(token, user_id, token_type='verification'):
    """
    Store verification token in cache with expiration
    """
    cache_key = f"{token_type}:{token}"
    if token_type == 'verification':
        timeout = settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS * 3600  # Convert to seconds
    else:  # password reset
        timeout = settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS * 3600
    
    cache.set(cache_key, user_id, timeout=timeout)
    return cache_key

def get_user_from_token(token, token_type='verification'):
    """
    Get user ID from token and validate it
    """
    cache_key = f"{token_type}:{token}"
    user_id = cache.get(cache_key)
    
    if user_id:
        return user_id
    
    return None

def delete_verification_token(token, token_type='verification'):
    """
    Delete verification token after successful use
    """
    cache_key = f"{token_type}:{token}"
    cache.delete(cache_key)

def is_email_configured():
    """
    Check if email is properly configured
    """
    # For console backend, always return True to allow testing
    if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        return True
    
    # For SMTP backend, check Gmail configuration
    return (
        settings.EMAIL_HOST_USER and 
        settings.EMAIL_HOST_PASSWORD and 
        settings.EMAIL_HOST == 'smtp.gmail.com'
    )

def send_notification_email(notification):
    """
    Send email notification to user when a notification is created
    
    Args:
        notification: Django Notification instance
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    # Skip if email is not configured
    if not is_email_configured():
        logger.warning("Email not configured, skipping notification email")
        return False
    
    # Skip if user doesn't have an email
    if not notification.user.email:
        logger.warning(f"User {notification.user.username} has no email, skipping notification email")
        return False
    
    try:
        # Determine action URL based on notification type
        action_url = None
        if notification.notification_type == 'task_due':
            action_url = f"{settings.FRONTEND_URL}/tasks"
        elif notification.notification_type == 'task_completed':
            action_url = f"{settings.FRONTEND_URL}/tasks"
        elif notification.notification_type == 'study_reminder':
            action_url = f"{settings.FRONTEND_URL}/study-timer"
        elif notification.notification_type == 'note_reminder':
            action_url = f"{settings.FRONTEND_URL}/notes"
        else:
            action_url = f"{settings.FRONTEND_URL}/notifications"
        
        # Render HTML email template
        html_message = render_to_string('email/notification.html', {
            'username': notification.user.username,
            'email': notification.user.email,
            'notification_title': notification.title,
            'notification_message': notification.message,
            'notification_type': notification.notification_type,
            'action_url': action_url,
            'site_name': settings.SITE_NAME,
        })
        
        # Create plain text version
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=f'{notification.title} - {settings.SITE_NAME}',
            message=plain_message,
            from_email=f"ProdActivity <{settings.EMAIL_HOST_USER}>",
            recipient_list=[notification.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Notification email sent to {notification.user.email} for: {notification.title}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send notification email to {notification.user.email}: {str(e)}")
        return False