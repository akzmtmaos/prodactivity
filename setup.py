#!/usr/bin/env python3
"""
Setup script for ProdActivity project
This script helps team members set up the project quickly
"""

import os
import sys
import subprocess
import platform

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_prerequisites():
    """Check if required software is installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Python
    try:
        python_version = subprocess.run([sys.executable, "--version"], 
                                      capture_output=True, text=True, check=True)
        print(f"✅ Python: {python_version.stdout.strip()}")
    except:
        print("❌ Python not found. Please install Python 3.11+")
        return False
    
    # Check Node.js
    try:
        node_version = subprocess.run(["node", "--version"], 
                                    capture_output=True, text=True, check=True)
        print(f"✅ Node.js: {node_version.stdout.strip()}")
    except:
        print("❌ Node.js not found. Please install Node.js 18+")
        return False
    
    # Check npm
    try:
        npm_version = subprocess.run(["npm", "--version"], 
                                   capture_output=True, text=True, check=True)
        print(f"✅ npm: {npm_version.stdout.strip()}")
    except:
        print("❌ npm not found. Please install npm")
        return False
    
    return True

def setup_backend():
    """Set up the Django backend"""
    print("\n🐍 Setting up Django backend...")
    
    # Change to backend directory
    os.chdir('backend')
    
    # Create virtual environment
    if not run_command(f"{sys.executable} -m venv venv", "Creating virtual environment"):
        return False
    
    # Activate virtual environment
    if platform.system() == "Windows":
        activate_script = "venv\\Scripts\\Activate"
    else:
        activate_script = "source venv/bin/activate"
    
    # Install requirements
    if platform.system() == "Windows":
        pip_command = "venv\\Scripts\\pip"
    else:
        pip_command = "venv/bin/pip"
    
    if not run_command(f"{pip_command} install -r requirements.txt", "Installing Python dependencies"):
        return False
    
    # Create .env file if it doesn't exist
    if not os.path.exists('.env'):
        if os.path.exists('env_template.txt'):
            run_command("copy env_template.txt .env", "Creating .env file from template")
            print("⚠️  Please edit the .env file with your configuration")
        else:
            print("⚠️  No env_template.txt found. Please create a .env file manually")
    
    # Run migrations
    if not run_command(f"{pip_command} install django", "Installing Django"):
        return False
    
    if not run_command(f"{sys.executable} manage.py makemigrations", "Creating database migrations"):
        return False
    
    if not run_command(f"{sys.executable} manage.py migrate", "Applying database migrations"):
        return False
    
    print("✅ Backend setup completed!")
    return True

def setup_frontend():
    """Set up the React frontend"""
    print("\n⚛️  Setting up React frontend...")
    
    # Change to frontend directory
    os.chdir('../frontend')
    
    # Install npm dependencies
    if not run_command("npm install", "Installing npm dependencies"):
        return False
    
    print("✅ Frontend setup completed!")
    return True

def main():
    """Main setup function"""
    print("🚀 Welcome to ProdActivity Setup!")
    print("=" * 50)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites check failed. Please install required software.")
        return
    
    # Setup backend
    if not setup_backend():
        print("\n❌ Backend setup failed.")
        return
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed.")
        return
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit backend/.env file with your configuration")
    print("2. Start backend: cd backend && venv\\Scripts\\Activate && python manage.py runserver")
    print("3. Start frontend: cd frontend && npm start")
    print("4. Open http://localhost:3000 in your browser")
    print("\n📚 For more information, see README.md")

if __name__ == "__main__":
    main()
