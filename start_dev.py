#!/usr/bin/env python3
"""
Script to start both backend and frontend development servers
"""

import subprocess
import sys
import os
import time
import threading

def start_backend():
    """Start the Django backend server"""
    print("Starting Django backend server...")
    os.chdir('backend')
    
    # Activate virtual environment and start server
    if os.name == 'nt':  # Windows
        cmd = ['venv\\Scripts\\Activate', '&&', 'python', 'manage.py', 'runserver']
        subprocess.run(' '.join(cmd), shell=True)
    else:  # Unix/Linux/Mac
        cmd = ['source', 'venv/bin/activate', '&&', 'python', 'manage.py', 'runserver']
        subprocess.run(' '.join(cmd), shell=True)

def start_frontend():
    """Start the React frontend server"""
    print("Starting React frontend server...")
    os.chdir('frontend')
    subprocess.run(['npm', 'start'])

def main():
    """Start both servers"""
    print("Starting development servers...")
    print("Backend will run on http://localhost:8000")
    print("Frontend will run on http://localhost:3000")
    print("=" * 50)
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=start_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Wait a bit for backend to start
    time.sleep(3)
    
    # Start frontend
    start_frontend()

if __name__ == "__main__":
    main()
