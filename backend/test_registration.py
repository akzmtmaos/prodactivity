#!/usr/bin/env python3
"""
Test Registration and Email Verification
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import Profile
from core.email_utils import send_verification_email, generate_verification_token, store_verification_token, is_email_configured
from django.conf import settings

def test_registration_email():
    print("🔧 Testing Registration Email Process...")
    print(f"Email Backend: {settings.EMAIL_BACKEND}")
    print(f"Email Verification Required: {settings.EMAIL_VERIFICATION_REQUIRED}")
    print(f"Email Configured: {is_email_configured()}")
    print(f"Email Host User: {settings.EMAIL_HOST_USER}")
    print(f"Default From Email: {settings.DEFAULT_FROM_EMAIL}")
    
    # Test email configuration
    if not is_email_configured():
        print("❌ Email is not properly configured!")
        return False
    
    # Create a test user
    test_email = "sandiegoc89@gmail.com"
    test_username = "test_user_email"
    
    # Check if user already exists
    if User.objects.filter(username=test_username).exists():
        print(f"⚠️  Test user {test_username} already exists, using existing user")
        user = User.objects.get(username=test_username)
    else:
        print(f"📝 Creating test user: {test_username}")
        user = User.objects.create_user(
            username=test_username,
            email=test_email,
            password="testpassword123"
        )
        user.is_active = False  # Deactivate for email verification
        user.save()
        
        # Create profile if it doesn't exist
        Profile.objects.get_or_create(user=user)
    
    # Generate and store verification token
    print("🔑 Generating verification token...")
    token = generate_verification_token()
    store_verification_token(token, user.id, 'verification')
    
    # Send verification email
    print(f"📧 Sending verification email to {test_email}...")
    success = send_verification_email(user, token)
    
    if success:
        print("✅ Verification email sent successfully!")
        print("📬 Check your Gmail inbox for the verification email")
        print("🔗 The email should contain a verification link")
        return True
    else:
        print("❌ Failed to send verification email")
        return False

if __name__ == "__main__":
    test_registration_email()
