#!/usr/bin/env python3
"""
Reset User Password
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

def reset_user_password(email, new_password):
    print(f"🔧 Resetting password for user: {email}")
    
    # Find user by email
    user = User.objects.filter(email=email).first()
    
    if not user:
        print("❌ User not found!")
        return False
    
    print(f"✅ User found: {user.username}")
    
    # Set new password
    user.set_password(new_password)
    user.save()
    
    print(f"✅ Password reset successfully!")
    print(f"📧 Email: {user.email}")
    print(f"🔐 New password: {new_password}")
    print(f"👤 Username: {user.username}")
    
    return True

if __name__ == "__main__":
    email = input("Enter email: ").strip()
    new_password = input("Enter new password: ").strip()
    
    if not email or not new_password:
        print("❌ Email and password are required!")
        sys.exit(1)
    
    reset_user_password(email, new_password)
