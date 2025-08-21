#!/usr/bin/env python3
"""
Debug User Status and Verification
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

def debug_user(email):
    print(f"🔍 Debugging user: {email}")
    
    # Find user by email
    user = User.objects.filter(email=email).first()
    
    if not user:
        print("❌ User not found!")
        return
    
    print(f"✅ User found: {user.username}")
    print(f"📧 Email: {user.email}")
    print(f"🔐 Is Active: {user.is_active}")
    print(f"📅 Date Joined: {user.date_joined}")
    
    # Check profile
    try:
        profile = user.profile
        print(f"✅ Profile exists")
        print(f"📧 Email Verified: {profile.email_verified}")
        print(f"📅 Email Verified At: {profile.email_verified_at}")
    except Profile.DoesNotExist:
        print("❌ Profile does not exist!")
        # Create profile
        profile = Profile.objects.create(user=user)
        print("✅ Profile created")
    
    # Test password
    test_password = input("Enter the password you're trying to login with: ").strip()
    if user.check_password(test_password):
        print("✅ Password check successful")
    else:
        print("❌ Password check failed")
        print(f"   You entered: '{test_password}'")
        print("   This password doesn't match the stored password for this user")
    
    # Check if user can login
    if user.is_active and profile.email_verified:
        print("✅ User should be able to login")
    else:
        print("❌ User cannot login:")
        if not user.is_active:
            print("  - User is not active")
        if not profile.email_verified:
            print("  - Email is not verified")

if __name__ == "__main__":
    email = input("Enter email to debug: ").strip()
    debug_user(email)
