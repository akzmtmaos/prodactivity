from django.apps import AppConfig
from django.core.cache import cache


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Ensure cache is usable in dev; no-op placeholder
        try:
            cache.get('healthcheck')
        except Exception:
            pass
