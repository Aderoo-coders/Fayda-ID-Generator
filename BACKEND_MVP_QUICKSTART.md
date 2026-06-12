# Backend Implementation Quick Start
# Phase 1: MVP Backend Setup

## Quick Start Commands

```bash
# 1. Create Django project structure
django-admin startproject config .
django-admin startapp core
django-admin startapp api

# 2. Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize database
python manage.py migrate
python manage.py createsuperuser

# 5. Run development server
python manage.py runserver

# 6. Run Celery worker (separate terminal)
celery -A config worker -l info

# 7. Run Celery Beat scheduler (separate terminal)
celery -A config beat -l info
```

---

## required Minimal requirements.txt

```
# Web Framework
Django==4.2.13
djangorestframework==3.14.0
django-cors-headers==4.3.1
django-filter==24.1
django-extensions==3.2.3

# Database
psycopg2-binary==2.9.9
django-db-connection-pool==1.3.0

# Async & Background Jobs
celery==5.3.4
redis==5.0.1
django-celery-beat==2.5.0
django-celery-results==2.5.1

# Authentication & Security
djangorestframework-simplejwt==5.3.2
django-environ==0.11.2
cryptography==42.0.2

# Detection & Processing
opencv-python==4.9.0.80
pyzbar==0.1.9
pytesseract==0.3.10
Pillow==10.2.0
numpy==1.26.4

# ML/AI
easyocr==1.7.0
mediapipe==0.10.9

# LLM Integration
openai==1.12.0
anthropic==0.12.0
groq==0.9.0

# PDF & Export
PyPDF2==4.0.1
pdf2image==1.16.3
reportlab==4.0.9
weasyprint==60.1

# Payment
stripe==7.4.0

# Monitoring & Logging
sentry-sdk==1.42.0
python-json-logger==2.0.7

# Utilities
requests==2.31.0
python-dateutil==2.8.2
pytz==2024.1
Faker==22.6.0

# Testing
pytest==7.4.3
pytest-django==4.7.0
pytest-cov==4.1.0
factory-boy==3.3.0

# Development
black==24.2.0
isort==5.13.2
flake8==7.0.0
pylint==3.0.3
```

---

## Project Structure After Setup

```
backend/
├── config/
│   ├── __init__.py
│   ├── settings.py              # Start simple, split later
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py
│   └── celery.py
│
├── core/
│   ├── migrations/
│   ├── __init__.py
│   ├── models.py
│   ├── admin.py
│   ├── authentication.py        # JWT setup
│   ├── permissions.py           # DRF permissions
│   └── views.py                 # Health check, root
│
├── api/
│   ├── urls.py                  # Route all endpoints
│   ├── auth/
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── users/
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   └── jobs/
│       ├── views.py
│       ├── serializers.py
│       └── urls.py
│
├── engines/
│   ├── detection/
│   │   ├── barcode_engine.py
│   │   └── face_detector.py
│   ├── inference/
│   │   └── ocr_service.py
│   └── rendering/
│       └── pdf_generator.py
│
├── workers/
│   ├── __init__.py
│   └── tasks.py
│
├── models/
│   ├── __init__.py
│   ├── user.py
│   └── job.py
│
├── services/
│   ├── __init__.py
│   ├── user_service.py
│   └── storage_service.py
│
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_jobs.py
│
├── migrations/          # Auto-generated
│
├── manage.py
├── requirements.txt
├── requirements-dev.txt
├── .env
├── .env.example
├── docker-compose.yml   # For local development
├── Dockerfile
└── gunicorn.conf.py
```

---

## Phase 1 Implementation Checklist

### Week 1: Foundation

- [ ] **Day 1-2**: Django + DRF setup
  - [ ] Create project and apps
  - [ ] Configure CORS, JWT, database
  - [ ] Set up PostgreSQL locally (Docker)
  - [ ] Create initial migrations

- [ ] **Day 3-4**: User models and authentication
  - [ ] Implement User model (extend AbstractUser)
  - [ ] JWT token generation/validation
  - [ ] Login, register, token refresh endpoints
  - [ ] Tests for auth endpoints

- [ ] **Day 5**: Job model and API
  - [ ] Create Job, ExtractionResult models
  - [ ] POST /api/jobs endpoint (upload)
  - [ ] GET /api/jobs/{id} endpoint (polling)
  - [ ] Basic validation and error handling

### Week 2: Local Detection Engines

- [ ] **Day 1-2**: Barcode detection
  - [ ] Implement barcode_engine.py using Pyzbar
  - [ ] Add format validation
  - [ ] Create test fixtures with sample barcodes

- [ ] **Day 3-4**: OCR integration
  - [ ] Set up Tesseract
  - [ ] Implement ocr_service.py
  - [ ] Field-specific tuning for Ethiopian IDs
  - [ ] Amharic language support

- [ ] **Day 5**: Pipeline integration
  - [ ] Create extraction_pipeline.py orchestrator
  - [ ] Implement preprocessing (image normalization)
  - [ ] Merge results with confidence scoring
  - [ ] End-to-end integration test

### Week 3: Job Processing & Export

- [ ] **Day 1-2**: Celery setup
  - [ ] Configure Redis (Docker)
  - [ ] Create Celery tasks for job processing
  - [ ] Task error handling and retries
  - [ ] Task progress tracking

- [ ] **Day 3-4**: PDF export
  - [ ] Implement pdf_generator.py (WeasyPrint)
  - [ ] Create card template rendering
  - [ ] S3 upload integration (stub with local files for now)
  - [ ] Export endpoint (POST /api/jobs/{id}/export)

- [ ] **Day 5**: Manual edits & audit trail
  - [ ] PATCH /api/jobs/{id} endpoint
  - [ ] AuditLog model and creation
  - [ ] Edit history tracking
  - [ ] Tests for manual corrections

### Week 4: Integration & Deployment

- [ ] **Day 1-2**: Admin panel
  - [ ] Django admin customization
  - [ ] Job monitoring dashboard
  - [ ] User management interface

- [ ] **Day 3**: Testing & documentation
  - [ ] Unit tests for all engines
  - [ ] Integration tests for full pipeline
  - [ ] API documentation (Swagger/ReDoc)

- [ ] **Day 4-5**: Docker & local deployment
  - [ ] Create Dockerfile
  - [ ] docker-compose.yml for full stack
  - [ ] Environment configuration
  - [ ] Run locally end-to-end

---

## Core Django Models (Phase 1)

```python
# models/user.py
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    credits_balance = models.IntegerField(default=0)
    tier = models.CharField(
        max_length=20,
        choices=[('free', 'Free'), ('pro', 'Pro')],
        default='free'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# models/job.py
class Job(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    input_file = models.FileField(upload_to='uploads/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    progress_percent = models.IntegerField(default=0)
    
    extraction_result = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
```

---

## Core Celery Task (Phase 1)

```python
# workers/tasks.py
from celery import shared_task
from core.models import Job
from engines.extraction_pipeline import run_extraction_pipeline

@shared_task(bind=True, max_retries=3)
def extract_job(self, job_id):
    """Main extraction pipeline task"""
    try:
        job = Job.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        
        # Run extraction
        result = run_extraction_pipeline(job.input_file)
        
        # Save results
        job.extraction_result = result
        job.status = 'completed'
        job.progress_percent = 100
        job.save()
        
    except Exception as exc:
        job.status = 'failed'
        job.error_message = str(exc)
        job.save()
        
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

---

## First Integration Test

```python
# tests/test_full_pipeline.py
import pytest
from django.test import Client
from core.models import User, Job

@pytest.mark.django_db
def test_full_extraction_pipeline(sample_id_pdf):
    """Test: upload PDF → extract → download results"""
    
    # 1. Create user
    user = User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        credits_balance=10
    )
    
    # 2. Get token
    client = Client()
    response = client.post('/api/auth/login', {
        'email': 'test@example.com',
        'password': 'testpass123',
    }, content_type='application/json')
    assert response.status_code == 200
    token = response.json()['access_token']
    
    # 3. Upload PDF
    response = client.post(
        '/api/jobs',
        {'file': sample_id_pdf},
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    assert response.status_code == 202
    job_id = response.json()['id']
    
    # 4. Poll until completion
    for _ in range(30):  # Max 30 attempts (60 seconds)
        response = client.get(
            f'/api/jobs/{job_id}',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        job_data = response.json()
        if job_data['status'] == 'completed':
            break
        time.sleep(2)
    
    # 5. Verify extraction
    assert job_data['status'] == 'completed'
    assert 'extraction_result' in job_data
    assert 'fin' in job_data['extraction_result']['data']
    
    print("✅ Full pipeline test passed!")
```

---

## Key Configuration Files

### settings.py (Django)
```python
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-not-for-production')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'core',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'fayda'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'password'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
```

### celery.py
```python
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('fayda')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fayda
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    ports:
      - "8000:8000"
    environment:
      DEBUG: "True"
      DATABASE_URL: postgresql://postgres:password@postgres:5432/fayda
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app

  celery:
    build: .
    command: celery -A config worker -l info
    environment:
      DEBUG: "True"
      DATABASE_URL: postgresql://postgres:password@postgres:5432/fayda
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## Success Metrics for Phase 1

✅ All endpoints from contract implemented and tested
✅ Local PDF extraction working end-to-end
✅ Celery tasks processing jobs asynchronously
✅ Manual edits persisted with audit trail
✅ Docker Compose stack runs locally
✅ API documentation auto-generated
✅ >80% test coverage

---

## Next Steps (Phase 2)

After Phase 1 MVP is stable:

1. **Cloud AI Integration**: Connect Gemini/Groq cascade
2. **Payment System**: Stripe integration + webhooks
3. **Advanced Export**: Batch CSV/JSON exports
4. **Monitoring**: Sentry + DataDog integration
5. **Production Deployment**: Kubernetes manifests

---

## Support Resources

- Django Documentation: https://docs.djangoproject.com/
- DRF Documentation: https://www.django-rest-framework.org/
- Celery Guide: https://docs.celeryproject.org/
- Tesseract Setup: https://github.com/tesseract-ocr/tesseract/wiki
- Docker Compose: https://docs.docker.com/compose/

This MVP provides a solid foundation for the full layered architecture!
