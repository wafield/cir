# Django settings for cir project.
import os
import socket

DEBUG = True

TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Ye Tian', 'yxt157@ist.psu.edu'),
)

MANAGERS = ADMINS

server_ip = socket.gethostbyname(socket.gethostname())

# on local dev -- use different DB setups
SERVER_HOST = '127.0.0.1'
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'cir_backup_20161125',  # Or path to database file if using sqlite3.
        'USER': 'postgres',
        'PASSWORD': 'asdf1234',
        'HOST': SERVER_HOST,
        'PORT': '',  # Set to empty string for default.
    },
    'dev': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'cir_backup_20161125',  # Or path to database file if using sqlite3.
        'USER': 'postgres',
        'PASSWORD': 'asdf1234',
        'HOST': SERVER_HOST,
        'PORT': '',  # Set to empty string for default.
    }
}

# dispatcher url
if DEBUG:
    DISPATCHER_URL = '127.0.0.1:443'
else:
    DISPATCHER_URL = '130.203.136.141:443'

PROJECT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROJECT_ROOT = os.path.dirname(os.path.realpath(__file__))
POSTGIS_VERSION = (2, 0, 3)
# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    '.ist.psu.edu',
]

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = os.path.join(PROJECT_PATH, 'media/')

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = '/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"

if DEBUG:
    STATIC_ROOT = os.path.join(PROJECT_PATH, '../cir-static/')
else:
    STATIC_ROOT = os.path.join(PROJECT_PATH, '../static/geolab/')

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PROJECT_PATH, 'static'),
)

STATICFILES_STORAGE = 'pipeline.storage.PipelineStorage'
PIPELINE_EMBED_MAX_IMAGE_SIZE = 120000
PIPELINE_EMBED_PATH = r'[/]?static/embed/'
PIPELINE_CSS = {
    'cir_global': {
        'source_filenames': (
            'css/container.css',
            'css/page_body.css',
        ),
        'output_filename': 'css/cir_global.css',
    },
    'cir_forum': {
        'source_filenames': (
            'css/document.css',
            'css/claim.css',
            'css/chatter.css',
            'css/vis.css'
            ),
        'output_filename': 'css/cir_forum.css',
    },
    'cir_dashboard': {
        'source_filenames': (
            'css/dashboard.css',
        ),
        'output_filename': 'css/cir_dashboard.css',
    }
}

PIPELINE_JS = {
    'cir_global': {
        'source_filenames': (
            'js/header.js',
            'js/utils.js',
        ),
        'output_filename': 'js/cir_global.js',
    },
    'cir_forum': {
        'source_filenames': (
            'js/layout.js',
            'js/document.js',
            'js/claim.js',
            'js/activity-feed.js',
            'js/utils.js',
            'js/workbench2.js',
        ),
        'output_filename': 'js/cir_forum.js',
    },
    'cir_dashboard': {
        'source_filenames': (
            'js/dashboard.js',
        ),
        'output_filename': 'js/cir_dashboard.js',
    }
}

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'pipeline.finders.PipelineFinder',
    # 'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'cj6k998fi&=fesrf39*2g07jcuf!%)=xfnvji8z2f==d7yb_-d'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    # 'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
        # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.transaction.TransactionMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

DATABASE_ROUTERS = ['cir.user_db_router.UserForumRoleRouter']
ROOT_URLCONF = 'cir.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'cir.wsgi.application'

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(BASE_DIR, 'templates'),
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'cir',
    'password_reset',
    'pipeline',
    'mptt',
    'south',
)

SESSION_SERIALIZER = 'django.contrib.sessions.serializers.JSONSerializer'
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_USE_TLS = True
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_USER = 'community.forum.cir@gmail.com'
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
EMAIL_HOST_PASSWORD = 'geodeliberation'
EMAIL_PORT = 587

# CIR app settings
