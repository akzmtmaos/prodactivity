from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-i$uch6xcxz80fiq6td7+#z_lrz(thlxfqsha-1#r(w7&n*^o8e')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.56.1', '192.168.68.114', '192.168.68.162', '0.0.0.0', '*']

# Hugging Face API Key
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
if not HUGGINGFACE_API_KEY:
    raise ValueError("HUGGINGFACE_API_KEY environment variable is not set")

# Application definition

INSTALLED_APPS = [
    'jazzmin',  # Modern admin theme
    'core',   # core app for CMS and terms
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts', # login
    'notes',  # notes
    'decks',  # decks
    'tasks',  # tasks
    'reviewer', # reviewer app
    'schedule', # schedule app
    'progress', # progress app
    # 'django_extensions', # for show_urls and other dev tools
]

JAZZMIN_SETTINGS = {
    "site_title": "Prodactivity Admin",
    "site_header": "Prodactivity Admin",
    "site_brand": "Prodactivity",
    "welcome_sign": "Welcome to the Prodactivity Admin Portal",
    "copyright": "Prodactivity",
    # Custom icons for apps and models
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.group": "fas fa-users",
        "accounts": "fas fa-user-circle",
        "notes": "fas fa-sticky-note",
        "notes.notebook": "fas fa-book",
        "notes.note": "fas fa-sticky-note",
        "decks": "fas fa-layer-group",
        "decks.deck": "fas fa-layer-group",
        "decks.flashcard": "fas fa-clone",
        "tasks": "fas fa-tasks",
        "tasks.task": "fas fa-tasks",
        "reviewer": "fas fa-user-check",
        "reviewer.reviewer": "fas fa-user-check",
        "schedule": "fas fa-calendar-alt",
        "schedule.event": "fas fa-calendar-alt",
        "progress": "fas fa-chart-line",
        "progress.productivityscalehistory": "fas fa-chart-line",
        "core": "fas fa-cogs",
        "core.termsandconditions": "fas fa-file-contract",
    },
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-success",
    "accent": "accent-teal",
    "navbar": "navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": False,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": False,
    "sidebar": "sidebar-dark-info",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "cyborg",  # Beautiful dark mode
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # 'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    # 'PAGE_SIZE': 10,
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),    # extended access token lifetime
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),    # extended refresh token lifetime  
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

# CORS Headers configuration
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-timezone-offset',  # Allow our custom timezone header
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'prodactivity_db'),
        'USER': os.getenv('DB_USER', 'akzmtmaos'),
        'PASSWORD': os.getenv('DB_PASSWORD', '12345mark'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Create media directories if they don't exist
os.makedirs(os.path.join(MEDIA_ROOT, 'temp'), exist_ok=True)

# Email backend (console for development)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'sandiegoc89@gmail.com')

# Gmail SMTP Configuration
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')  # Your Gmail address
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')  # App password from Gmail

# Email verification settings
EMAIL_VERIFICATION_REQUIRED = os.getenv('EMAIL_VERIFICATION_REQUIRED', 'True').lower() == 'true'
# EMAIL_VERIFICATION_REQUIRED = os.getenv('EMAIL_VERIFICATION_REQUIRED', 'False').lower() == 'true'

# Handle invalid EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS values
try:
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = int(os.getenv('EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS', '24'))
except ValueError:
    print("Warning: Invalid EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS value, using default 24")
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = 24

# Password reset settings
try:
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS = int(os.getenv('PASSWORD_RESET_TOKEN_EXPIRE_HOURS', '1'))
except ValueError:
    print("Warning: Invalid PASSWORD_RESET_TOKEN_EXPIRE_HOURS value, using default 1")
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1

# Site settings for email links
SITE_NAME = os.getenv('SITE_NAME', 'Prodactivity')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Simple cache for password reset tokens
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'prodactivity-cache',
    }
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.56.1:3000",
    "http://192.168.68.114:3000",
    "http://192.168.68.162:3000",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.56.1:3000",
    "http://192.168.68.114:3000",
    "http://192.168.68.162:3000",
]

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://tyuiugbvqmeatyjpenzg.supabase.co')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWl1Z2J2cW1lYXR5anBlbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTQ1MjcsImV4cCI6MjA3Mjg3MDUyN30.Kb8tj1jaBIm8XxLQuaVQr-8I-v4JhrPjKAD_jv_yp30')