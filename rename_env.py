#!/usr/bin/env python3
"""
Script to rename env.txt to .env file
"""

import os
import shutil

def rename_env_file():
    print("🔄 Renaming env.txt to .env...")
    
    env_txt_path = os.path.join('backend', 'env.txt')
    env_path = os.path.join('backend', '.env')
    
    if not os.path.exists(env_txt_path):
        print("❌ env.txt file not found in backend directory")
        return
    
    try:
        # Copy env.txt to .env
        shutil.copy2(env_txt_path, env_path)
        print(f"✅ Successfully created {env_path}")
        print("\n📋 Next steps:")
        print("1. Edit the .env file with your actual Gmail credentials")
        print("2. Test the email configuration: python test_email.py")
        print("3. Start your backend server: python manage.py runserver")
        
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")

if __name__ == "__main__":
    rename_env_file()
