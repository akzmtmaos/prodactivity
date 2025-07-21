from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    # Placeholder for signals if needed in the future
    # def ready(self):
    #     import core.signals 