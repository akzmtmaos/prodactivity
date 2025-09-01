#!/usr/bin/env python3
"""
Gmail SMTP Setup Script for Prodactivity
"""

import os
import getpass

def create_env_file():
    print("🔧 Gmail SMTP Setup for Prodactivity")
    print("=" * 50)
    
    print("\n📋 Prerequisites:")
    print("1. Enable 2-Factor Authentication on your Gmail account")
    print("2. Generate an App Password from Google Account settings")
    print("3. Have your Hugging Face API key ready")
    
    print("\n📧 Please enter your Gmail credentials:")
    email = input("Gmail address: ").strip()
    
    if not email or '@gmail.com' not in email:
        print("❌ Please enter a valid Gmail address")
        return
    
    print("\n🔑 Please enter your Gmail App Password:")
    print("(This is a 16-character password from Google Account → Security → 2-Step Verification → App passwords)")
    app_password = getpass.getpass("App Password: ").strip()
    
    if not app_password or len(app_password) < 16:
        print("❌ Please enter a valid 16-character App Password")
        return
    
    print("\n🤗 Please enter your Hugging Face API key:")
    huggingface_key = getpass.getpass("Hugging Face API Key: ").strip()
    
    if not huggingface_key:
        print("❌ Hugging Face API key is required")
        return
    
    # Create .env content
    env_content = f"""# Email Configuration (Gmail SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER={email}
EMAIL_HOST_PASSWORD={app_password}

# Email Verification Settings
EMAIL_VERIFICATION_REQUIRED=True
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS=24
PASSWORD_RESET_TOKEN_EXPIRE_HOURS=1

# Site Settings
SITE_NAME=Prodactivity
FRONTEND_URL=http://localhost:3000
DEFAULT_FROM_EMAIL={email}

# Database Configuration
DB_NAME=prodactivity_db
DB_USER=akzmtmaos
DB_PASSWORD=12345mark
DB_HOST=localhost
DB_PORT=5432

# Django Secret Key
DJANGO_SECRET_KEY=django-insecure-i$uch6xcxz80fiq6td7+#z_lrz(thlxfqsha-1#r(w7&n*^o8e

# Hugging Face API Key
HUGGINGFACE_API_KEY={huggingface_key}
"""
    
    # Write to .env file
    env_path = os.path.join('backend', '.env')
    
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        
        print(f"\n✅ Successfully created {env_path}")
        print("\n📋 Next steps:")
        print("1. Test the email configuration: cd backend && venv\\Scripts\\Activate && python test_email.py")
        print("2. Start your backend server: python manage.py runserver")
        print("3. Try registering a new account")
        print("4. Check your Gmail inbox for verification emails")
        
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")

if __name__ == "__main__":
    create_env_file()
