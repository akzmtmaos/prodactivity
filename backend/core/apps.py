from django.apps import AppConfig
import os

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    
    def ready(self):
        # Only start scheduler in the main process, not in reloader or migration processes
        if os.environ.get('RUN_MAIN') == 'true':
            from core.scheduler import start_scheduler
            start_scheduler() 