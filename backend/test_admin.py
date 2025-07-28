#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Test imports
try:
    from progress.models import ProductivityScaleHistory
    print("✅ ProductivityScaleHistory model imported successfully")
except Exception as e:
    print(f"❌ Error importing model: {e}")

# Test admin registration
try:
    from django.contrib import admin
    from progress.admin import ProductivityScaleHistoryAdmin
    print("✅ Admin registration imported successfully")
except Exception as e:
    print(f"❌ Error importing admin: {e}")

# Test if model is registered
try:
    registered_models = admin.site._registry
    if ProductivityScaleHistory in registered_models:
        print("✅ ProductivityScaleHistory is registered in admin")
    else:
        print("❌ ProductivityScaleHistory is NOT registered in admin")
        print("Registered models:", list(registered_models.keys()))
except Exception as e:
    print(f"❌ Error checking admin registry: {e}")

print("Test completed!") 