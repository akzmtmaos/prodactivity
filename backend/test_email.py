#!/usr/bin/env python
"""
Test script to verify email configuration
Run this script to test if your Gmail SMTP setup is working correctly.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email_configuration():
    """Test the email configuration"""
    print("🔧 Testing Email Configuration...")
    print(f"Email Backend: {settings.EMAIL_BACKEND}")
    print(f"Email Host: {settings.EMAIL_HOST}")
    print(f"Email Port: {settings.EMAIL_PORT}")
    print(f"Email Use TLS: {settings.EMAIL_USE_TLS}")
    print(f"Email Host User: {settings.EMAIL_HOST_USER}")
    print(f"Email Host Password: {'*' * len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 'Not set'}")
    print(f"Default From Email: {settings.DEFAULT_FROM_EMAIL}")
    print()

    # Check if email is configured
    if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        print("❌ Email configuration incomplete!")
        print("Please set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in your .env file")
        return False

    # Test email sending
    test_email = input("Enter your email address to send a test email: ").strip()
    
    if not test_email:
        print("❌ No email address provided")
        return False

    try:
        print(f"📧 Sending test email to {test_email}...")
        
        send_mail(
            subject='Test Email from Prodactivity',
            message='This is a test email to verify your Gmail SMTP configuration is working correctly.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            fail_silently=False,
        )
        
        print("✅ Test email sent successfully!")
        print("Check your inbox (and spam folder) for the test email.")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        print("\nCommon issues:")
        print("1. Make sure you're using an App Password, not your regular Gmail password")
        print("2. Ensure 2-Factor Authentication is enabled on your Gmail account")
        print("3. Check that your firewall isn't blocking port 587")
        print("4. Verify your internet connection")
        return False

if __name__ == "__main__":
    test_email_configuration()
