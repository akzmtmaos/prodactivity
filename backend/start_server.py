#!/usr/bin/env python3
"""
Simple script to start Django development server
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import execute_from_command_line

if __name__ == "__main__":
    # Start the development server
    execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:8000'])
