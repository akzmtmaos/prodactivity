#!/usr/bin/env python3
"""
Check Environment Variables
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings

def check_env_vars():
    print("🔧 Checking Environment Variables...")
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_HOST_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"EMAIL_VERIFICATION_REQUIRED: {settings.EMAIL_VERIFICATION_REQUIRED}")
    print(f"SITE_NAME: {settings.SITE_NAME}")
    print(f"FRONTEND_URL: {settings.FRONTEND_URL}")
    
    # Check if .env file exists
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        print(f"✅ .env file exists at: {env_path}")
        with open(env_path, 'r') as f:
            content = f.read()
            if 'DEFAULT_FROM_EMAIL=sandiegoc89@gmail.com' in content:
                print("✅ DEFAULT_FROM_EMAIL is set correctly in .env")
            else:
                print("❌ DEFAULT_FROM_EMAIL is NOT set correctly in .env")
                print("Current .env content:")
                print(content)
    else:
        print(f"❌ .env file NOT found at: {env_path}")

if __name__ == "__main__":
    check_env_vars()
