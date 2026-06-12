# Fayda ID Generator - Backend Architecture & Tech Stack

## Executive Summary

Based on deep analysis of the frontend detection pipelines, this document provides:
1. **Layered Architecture** with clean separation of concerns
2. **Directory Structure** aligned with service responsibilities
3. **Tech Stack Recommendations** matched to frontend requirements
4. **Data Models & APIs** for seamless frontend integration
5. **Implementation Phases** for incremental delivery

---

## Part 1: Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER (Next.js)                      │
│  Upload → Extract → Edit → Preview → Download                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              BACKEND API GATEWAY & ORCHESTRATION                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ • Request validation & routing                              │
│  │ • Authentication & authorization                           │
│  │ • Rate limiting & quota enforcement                        │
│  │ • Cross-cutting concerns (logging, monitoring)             │
│  └─────────────────────────────────────────────────────────────┤
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼───────┐  ┌─────▼──────────┐
│ DETECTION    │  │ INFERENCE      │  │ RENDERING      │
│ ENGINE       │  │ ENGINE         │  │ ENGINE         │
│              │  │                │  │                │
│ • Barcode    │  │ • OCR tasks    │  │ • HTML canvas  │
│ • QR codes   │  │ • LLM tasks    │  │ • PDF gen      │
│ • NFC tags   │  │ • Vision AI    │  │ • Image proc   │
└────────┬─────┘  └────────┬───────┘  └────────┬───────┘
         │                 │                   │
         │    ┌────────────┼───────────────┐   │
         │    │            │               │   │
         │    ▼            ▼               ▼   │
         └─► PROCESSING QUEUE / CELERY TASKS ─┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼───────┐  ┌─────▼──────────┐
│ USER         │  │ PAYMENT        │  │ STORAGE        │
│ SERVICE      │  │ SERVICE        │  │ SERVICE        │
│              │  │                │  │                │
│ • Profiles   │  │ • Credits      │  │ • PDFs         │
│ • Auth       │  │ • Packages     │  │ • Extractions  │
│ • Quotas     │  │ • Transactions │  │ • Exports      │
└──────────────┘  └────────────────┘  └────────────────┘
         │                 │                   │
         └─────────────────┼───────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │     DATA PERSISTENCE LAYER         │
        │  PostgreSQL + Redis + S3/GCS       │
        └───────────────────────────────────┘
```

---

## Part 2: Directory Structure & Microservices

### Recommended Backend Structure

```
backend/
├── config/
│   ├── settings.py           # Django settings (dev/prod/test)
│   ├── asgi.py               # Async ASGI for Celery
│   ├── wsgi.py               # WSGI for Gunicorn
│   ├── urls.py               # Root URL routing
│   └── celery.py             # Celery config
│
├── core/
│   ├── admin.py              # Django admin customization
│   ├── apps.py               # App configuration
│   ├── models.py             # Core data models (User, Job, etc)
│   ├── views.py              # Core views (health check, root)
│   ├── authentication.py      # JWT, OAuth handlers
│   ├── permissions.py        # DRF permission classes
│   ├── throttling.py         # Rate limiting
│   ├── pagination.py         # Pagination classes
│   └── utils.py              # Shared utilities
│
├── services/
│   ├── __init__.py
│   ├── user_service.py       # User CRUD, profile management
│   ├── payment_service.py     # Credit packages, transactions
│   ├── storage_service.py     # S3/GCS file operations
│   ├── email_service.py      # Email notifications
│   ├── cache_service.py      # Redis caching layer
│   └── monitoring_service.py # Sentry, CloudWatch integration
│
├── api/
│   ├── urls.py               # API URL routing
│   ├── auth/
│   │   ├── views.py          # Login, register, token refresh
│   │   ├── serializers.py    # Auth serializers
│   │   ├── throttles.py      # Auth-specific rate limits
│   │   └── urls.py
│   │
│   ├── users/
│   │   ├── views.py          # User CRUD, profile, stats
│   │   ├── serializers.py    # User serializers
│   │   ├── permissions.py    # User-specific permissions
│   │   └── urls.py
│   │
│   ├── jobs/
│   │   ├── views.py          # Job CRUD, status polling
│   │   ├── serializers.py    # Job serializers
│   │   ├── permissions.py    # Job ownership checks
│   │   └── urls.py
│   │
│   ├── packages/
│   │   ├── views.py          # Credit packages, pricing
│   │   ├── serializers.py    # Package serializers
│   │   └── urls.py
│   │
│   └── payments/
│       ├── views.py          # Payment endpoints (webhook receivers)
│       ├── serializers.py    # Payment serializers
│       ├── webhooks.py       # Stripe/PayPal webhook handlers
│       └── urls.py
│
├── engines/
│   ├── __init__.py
│   │
│   ├── detection/
│   │   ├── barcode_engine.py     # Barcode/QR detection (OpenCV + Pyzbar)
│   │   ├── nfc_engine.py         # NFC tag reader (optional)
│   │   ├── text_detector.py      # Text region detection (CRAFT/EAST)
│   │   ├── face_detector.py      # Face detection (MediaPipe/MTCNN)
│   │   └── validators.py         # Format & checksum validation
│   │
│   ├── inference/
│   │   ├── ocr_service.py        # Tesseract + EasyOCR (Amharic/English)
│   │   ├── llm_service.py        # LLM integration (Gemini, Groq, Claude)
│   │   ├── vision_service.py     # Vision API integration
│   │   ├── field_extractor.py    # Field extraction from raw outputs
│   │   └── confidence_scorer.py  # Confidence calculation
│   │
│   ├── rendering/
│   │   ├── pdf_generator.py      # PDF creation (reportlab/weasyprint)
│   │   ├── image_processor.py    # Image ops (PIL, OpenCV)
│   │   ├── qr_generator.py       # QR code generation
│   │   ├── template_engine.py    # Card template rendering
│   │   └── validators.py         # Output validation
│   │
│   └── export/
│       ├── formatters.py         # CSV, JSON, XML export
│       ├── batch_processor.py    # Batch export orchestration
│       └── archive_generator.py  # ZIP archive creation
│
├── pipelines/
│   ├── __init__.py
│   ├── extraction_pipeline.py    # Main orchestrator (multi-step)
│   ├── preprocessing.py          # Image normalization, cleanup
│   ├── postprocessing.py         # Data validation, formatting
│   ├── error_recovery.py         # Fallback strategies
│   └── telemetry.py              # Metrics collection
│
├── workers/
│   ├── __init__.py
│   ├── tasks.py                  # Celery task definitions
│   ├── upload_tasks.py           # PDF processing background jobs
│   ├── extraction_tasks.py       # Multi-stage extraction tasks
│   ├── export_tasks.py           # PDF/CSV export jobs
│   ├── notification_tasks.py     # Email/webhook notifications
│   └── cleanup_tasks.py          # Temp file cleanup, archiving
│
├── models/
│   ├── __init__.py
│   ├── user.py                   # User model + related
│   ├── job.py                    # Job, JobResult models
│   ├── extraction.py             # ExtractionResult, FieldExtraction
│   ├── payment.py                # Package, Transaction, CreditLog
│   ├── audit.py                  # AuditLog for compliance
│   └── integrations.py           # OAuth provider mappings
│
├── migrations/                   # Alembic/Django migrations
│   └── [version files]
│
├── tests/
│   ├── conftest.py               # Pytest fixtures
│   ├── test_auth.py              # Authentication tests
│   ├── test_jobs.py              # Job processing tests
│   ├── test_engines/
│   │   ├── test_barcode.py
│   │   ├── test_ocr.py
│   │   ├── test_llm.py
│   │   └── test_rendering.py
│   ├── test_integrations.py      # Payment/email integration tests
│   └── test_pipelines.py         # End-to-end pipeline tests
│
├── fixtures/
│   ├── sample_ids/              # Test ID card images
│   ├── sample_pdfs/             # Test PDF files
│   └── expected_outputs/        # Reference extraction results
│
├── logs/                        # Application logs directory
│
├── requirements.txt             # Python dependencies
├── requirements-dev.txt         # Development dependencies
├── .env.example                 # Environment variable template
├── docker-compose.yml           # Local development stack
├── Dockerfile                   # Production image
├── gunicorn.conf.py             # Gunicorn configuration
├── celery_worker.py             # Celery worker startup
├── manage.py                    # Django CLI
└── main.py                      # Alternative FastAPI entry (optional)
```

---

## Part 3: Technology Stack

### Core Framework Layer
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Web Framework** | Django 4.2 + DRF 3.14 | Proven, ORM, batteries included, admin UI |
| **ASGI Server** | Uvicorn (Gunicorn fallback) | Async support, better than uWSGI |
| **Task Queue** | Celery 5.3 + Redis | Distributed async processing, scheduled tasks |
| **Job Queue Worker** | Celery Beat | Periodic extraction pipeline runs |

### AI/ML & Detection Layer
| Component | Technology | Reason |
|-----------|-----------|--------|
| **OCR** | **Tesseract 5.x** (primary) + **EasyOCR** (fallback) | Field-specific tuning for Ethiopian IDs, Amharic support |
| **LLM Integration** | Python `anthropic`, `openai`, `groq` SDKs | Same providers as frontend, server-side validation |
| **Barcode/QR** | **Pyzbar** + **OpenCV** | Robust, handles rotated/damaged codes, video frame support |
| **Face Detection** | **MediaPipe** (Python) + **MTCNN** (fallback) | Lightweight, supports live camera feed |
| **Text Detection** | **CRAFT** or **EAST** models | Localize text regions before OCR |
| **Image Processing** | **Pillow** + **OpenCV** | Normalization, enhancement, preprocessing |

### Rendering & Export Layer
| Component | Technology | Reason |
|-----------|-----------|--------|
| **PDF Generation** | **WeasyPrint** or **ReportLab** | HTML/CSS templating vs. programmatic control |
| **QR Code** | **qrcode** Python library | Match frontend, support encoding |
| **Image Export** | **Pillow** + **NumPy** | PNG, JPEG optimization |

### Data & Storage Layer
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Primary Database** | **PostgreSQL 15** | JSONB for flexible extraction results, full-text search |
| **Cache Layer** | **Redis 7** | Session storage, rate limit counters, job status |
| **File Storage** | **AWS S3** or **Google Cloud Storage** | Scalable, CDN-friendly, lifecycle management |
| **Search** (optional) | **Elasticsearch** | Audit trail, job history full-text search |

### Payment Integration
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Payment Provider** | **Stripe** (primary) + **PayPal** (fallback) | Global reach, webhooks, refund support |
| **Payment Queue** | **Stripe webhooks** → Celery tasks | Async credit issuance |

### Infrastructure & DevOps
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Container** | **Docker** | Reproducible builds, multi-stage for size |
| **Orchestration** | **Kubernetes** or **Docker Compose** | K8s for production, Compose for dev |
| **CI/CD** | **GitHub Actions** | Free tier, GitHub integration |
| **Monitoring** | **Sentry** + **DataDog** | Error tracking, performance monitoring |
| **Logging** | **ELK Stack** or **CloudWatch** | Centralized, searchable logs |
| **Secrets** | **HashiCorp Vault** or **AWS Secrets Manager** | Rotation, audit trail |

---

## Part 4: Data Models & Database Schema

### Core Models

#### User Model
```python
class User(AbstractUser):
    # From Django AbstractUser: username, email, password, first_name, last_name
    
    # Extended fields
    phone_number = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True)
    
    # Credentials
    credits_balance = models.IntegerField(default=0)
    tier = models.CharField(
        max_length=20, 
        choices=[('free', 'Free'), ('pro', 'Pro'), ('enterprise', 'Enterprise')],
        default='free'
    )
    
    # OAuth
    google_id = models.CharField(max_length=255, blank=True, unique=True)
    
    # Compliance
    accepted_tos = models.BooleanField(default=False)
    accepted_privacy = models.BooleanField(default=False)
    data_retention_days = models.IntegerField(default=90)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['google_id']),
            models.Index(fields=['email']),
        ]
```

#### Job Model
```python
class Job(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs')
    
    # Input
    input_file = models.FileField(upload_to='uploads/jobs/')  # PDF
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    progress_percent = models.IntegerField(default=0)
    
    # Results
    extraction_result = models.JSONField(null=True, blank=True)  # Structured data
    result_file = models.FileField(upload_to='results/jobs/', blank=True)  # Export file
    error_message = models.TextField(blank=True)
    
    # Metadata
    input_file_size = models.IntegerField()  # bytes
    num_pages = models.IntegerField(default=1)
    processing_time_seconds = models.IntegerField(null=True, blank=True)
    credits_consumed = models.IntegerField(default=1)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
        ]
```

#### ExtractionResult Model
```python
class ExtractionResult(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='extraction')
    
    # Extracted fields (JSONB)
    data = models.JSONField()  # Full IDCardData structure
    
    # Confidence scores
    confidences = models.JSONField()  # {field_name: 0.0-1.0}
    
    # Metadata
    detected_sources = models.JSONField()  # Which engines contributed data
    
    # Quality metrics
    overall_confidence = models.FloatField()  # Average confidence
    manual_edits_count = models.IntegerField(default=0)
    manual_edit_history = models.JSONField(default=list)  # Audit trail
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### Package & Transaction Models
```python
class CreditPackage(models.Model):
    name = models.CharField(max_length=100)  # "100 Credits"
    credits = models.IntegerField()
    price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['credits']

class Transaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    package = models.ForeignKey(CreditPackage, on_delete=models.SET_NULL, null=True)
    
    amount_usd = models.DecimalField(max_digits=10, decimal_places=2)
    credits_granted = models.IntegerField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    stripe_payment_id = models.CharField(max_length=255, blank=True, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
        ]

class CreditLog(models.Model):
    OPERATION_CHOICES = [
        ('purchase', 'Purchase'),
        ('job_consumed', 'Job Consumption'),
        ('refund', 'Refund'),
        ('admin_adjustment', 'Admin Adjustment'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_logs')
    operation = models.CharField(max_length=20, choices=OPERATION_CHOICES)
    amount = models.IntegerField()  # Positive for add, negative for consume
    balance_after = models.IntegerField()
    
    related_transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True)
    related_job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
```

#### AuditLog Model (Compliance)
```python
class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)  # 'extraction', 'export', 'download'
    resource_type = models.CharField(max_length=50)  # 'job', 'user', 'extraction'
    resource_id = models.IntegerField()
    
    old_values = models.JSONField(null=True)
    new_values = models.JSONField(null=True)
    
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]
```

---

## Part 5: API Endpoint Specifications

### Authentication Endpoints

#### POST /api/auth/login
```json
Request:
{
  "email": "user@example.com",
  "password": "secure_password"
}

Response (200):
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "credits_balance": 50,
    "tier": "free"
  }
}
```

#### POST /api/auth/google
```json
Request:
{
  "token": "Google ID Token"
}

Response (200): Same as login
```

#### POST /api/auth/register
```json
Request:
{
  "email": "new@example.com",
  "password": "secure_password",
  "first_name": "John",
  "accepted_tos": true
}

Response (201): User object + tokens
```

#### POST /api/auth/token/refresh
```json
Request:
{
  "refresh_token": "..."
}

Response (200):
{
  "access_token": "..."
}
```

### Job Endpoints

#### POST /api/jobs (Upload & Process)
```json
Request:
{
  "file": <PDF binary>,
  "extraction_options": {
    "use_ocr": true,
    "use_cloud_ai": true,
    "ai_provider": "gemini"  // or "groq", "lovable"
  }
}

Response (202 Accepted):
{
  "id": 42,
  "status": "queued",
  "progress_percent": 0,
  "created_at": "2026-05-26T10:30:00Z",
  "estimated_time_seconds": 30
}
```

#### GET /api/jobs/{job_id}
```json
Response (200):
{
  "id": 42,
  "status": "completed",
  "progress_percent": 100,
  "extraction_result": {
    "data": {
      "fin": "1234-5678-9012",
      "name_en": "John Doe",
      ...
    },
    "confidences": {
      "fin": 0.95,
      "name_en": 0.88,
      ...
    },
    "detected_sources": {
      "fin": ["barcode"],
      "name_en": ["ocr", "cloud_ai"]
    }
  },
  "processing_time_seconds": 28,
  "credits_consumed": 1
}
```

#### PATCH /api/jobs/{job_id}
```json
Request (User manual edits):
{
  "extraction_result": {
    "data": {
      "name_en": "John Doe (corrected)"
    }
  }
}

Response (200): Updated Job object
```

#### POST /api/jobs/{job_id}/export
```json
Request:
{
  "format": "pdf"  // or "csv", "json"
}

Response (200):
{
  "export_url": "https://s3.example.com/exports/42.pdf",
  "file_size_bytes": 125000
}
```

#### GET /api/jobs
```json
Request (Querystring):
?status=completed&limit=20&offset=0

Response (200):
{
  "count": 150,
  "next": "?limit=20&offset=20",
  "results": [...]
}
```

### Package & Payment Endpoints

#### GET /api/packages
```json
Response (200):
{
  "results": [
    {
      "id": 1,
      "name": "Starter",
      "credits": 100,
      "price_usd": "9.99",
      "discount_percent": 0,
      "is_active": true
    },
    ...
  ]
}
```

#### POST /api/payments/purchase
```json
Request:
{
  "package_id": 1,
  "payment_method": "stripe"
}

Response (201):
{
  "id": 1,
  "status": "pending",
  "stripe_checkout_url": "https://checkout.stripe.com/...",
  "expires_at": "2026-05-26T11:30:00Z"
}
```

#### POST /api/payments/webhook/stripe
```
Receiver for Stripe events:
- charge.succeeded
- charge.refunded
- customer.subscription.updated
```

### User Endpoints

#### GET /api/users/me
```json
Response (200):
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "credits_balance": 50,
  "tier": "free",
  "created_at": "2025-01-01T00:00:00Z",
  "stats": {
    "total_jobs": 15,
    "total_credits_consumed": 15,
    "avg_extraction_confidence": 0.87
  }
}
```

#### GET /api/users/me/balance
```json
Response (200):
{
  "credits_balance": 50,
  "jobs_remaining_at_current_rate": 50
}
```

#### PATCH /api/users/me
```json
Request:
{
  "phone_number": "+251912345678",
  "data_retention_days": 180
}

Response (200): Updated User object
```

---

## Part 6: Processing Pipeline Architecture

### Multi-Stage Extraction Pipeline

```
┌─────────────────────────────────────────┐
│ 1. UPLOAD STAGE (Synchronous API)       │
│ • Validate PDF format                    │
│ • Extract pages as images (PDF → PNG)   │
│ • Create Job record (status: queued)     │
│ • Deduct preview credits (optional)      │
│ • Return Job ID for polling              │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼─────────┐
         │ Celery Task #1  │ (async)
         │ upload_job      │
         └───────┬─────────┘
                 │
┌────────────────▼────────────────────────┐
│ 2. PREPROCESSING STAGE                   │
│ • Deskew pages using orientation detection│
│ • Normalize to 2000×1300 canvas          │
│ • Enhance contrast for OCR               │
│ • Separate front & back sides            │
│ • Cache normalized images in Redis       │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼─────────┐
         │ Celery Task #2  │ (parallel tasks)
         │ extract_job     │
         └───────┬─────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐ ┌─────────┐ ┌──────────┐
│ Local  │ │ Cloud   │ │ Barcode  │
│ OCR    │ │ LLM     │ │ Detect   │
│(async) │ │ (async) │ │ (async)  │
└────────┘ └─────────┘ └──────────┘
    │            │            │
    └────────────┼────────────┘
                 │
┌────────────────▼────────────────────────┐
│ 3. MERGE & VALIDATION STAGE              │
│ • Combine results from all engines      │
│ • Apply confidence-weighted merge logic │
│ • Validate checksums (FIN, date format) │
│ • Flag uncertain fields                  │
│ • Format data to IDCardData schema      │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼─────────┐
         │ Celery Task #3  │
         │ postprocess_job │
         └───────┬─────────┘
                 │
┌────────────────▼────────────────────────┐
│ 4. RENDERING STAGE (Optional)            │
│ • Render card preview HTML/Canvas       │
│ • Generate QR code (if needed)          │
│ • Create PDF export version             │
│ • Store artifacts in S3                  │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼─────────┐
         │ Celery Task #4  │
         │ generate_export │
         └───────┬─────────┘
                 │
┌────────────────▼────────────────────────┐
│ 5. COMPLETION STAGE                      │
│ • Update Job status → completed          │
│ • Deduct main credits                    │
│ • Create AuditLog entry                  │
│ • Send notification email (optional)     │
│ • Schedule cleanup (90 days)             │
└────────────────────────────────────────┘
```

### Celery Task Queue Configuration

```python
# config/celery.py
from celery import Celery
from celery.schedules import crontab

app = Celery('fayda')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Task routes
CELERY_TASK_ROUTES = {
    'workers.tasks.upload_job': {'queue': 'uploads'},
    'workers.tasks.extract_job': {'queue': 'extractions'},
    'workers.tasks.generate_export': {'queue': 'exports'},
    'workers.tasks.cleanup_job': {'queue': 'maintenance'},
}

# Beat scheduler (periodic tasks)
app.conf.beat_schedule = {
    'cleanup-old-jobs': {
        'task': 'workers.tasks.cleanup_old_jobs',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'sync-payment-status': {
        'task': 'workers.tasks.sync_payment_status',
        'schedule': crontab(minute=0),  # Every hour
    },
}
```

---

## Part 7: Microservice Boundaries & Dependencies

### Service 1: User Service
**Responsibilities**: Authentication, profile management, quotas

**Endpoints**:
- POST /api/auth/*
- GET/PATCH /api/users/me

**Dependencies**:
- Database (User, AuditLog models)
- Email Service (notifications)

**External Integrations**:
- Google OAuth
- JWT token generation

---

### Service 2: Job Orchestration Service
**Responsibilities**: Job lifecycle, progress tracking, credit deduction

**Endpoints**:
- POST /api/jobs (create)
- GET /api/jobs (list)
- GET /api/jobs/{id} (details)
- PATCH /api/jobs/{id} (manual edits)

**Dependencies**:
- Database (Job, ExtractionResult models)
- Celery task queue
- Cache (Redis for progress tracking)
- Storage Service (S3)

**Triggers**:
- On job creation: Queue extraction task
- On extraction complete: Queue rendering task
- On completion: Deduct credits, send notification

---

### Service 3: Detection Engine Service
**Responsibilities**: Barcode/QR/Face detection

**Python Package Structure**:
```python
engines/detection/
├── barcode_engine.py
│   ├── detect_barcodes(image: np.ndarray) → List[BarcodeResult]
│   ├── _validate_checksum(format, value)
│   └── _enhance_for_detection(image) → np.ndarray
│
├── face_detector.py
│   ├── detect_faces(image: np.ndarray) → List[FaceBBox]
│   ├── validate_face_box(bbox, card_region)
│   └── extract_face_crop(image, bbox) → bytes
│
└── validators.py
    ├── validate_fin(value) → bool
    ├── validate_date_format(value) → bool
    └── validate_pattern(field_name, value) → bool
```

**Technologies**:
- OpenCV, Pyzbar, Python-barcode for barcode
- MediaPipe, MTCNN for face detection

---

### Service 4: Inference Engine Service
**Responsibilities**: OCR, LLM extraction, vision APIs

**Python Package Structure**:
```python
engines/inference/
├── ocr_service.py
│   ├── extract_text_region(image, bbox, language='en') → str
│   ├── extract_all_fields(image, side='front') → Dict[str, str]
│   └── configure_tesseract(psm, whitelist)
│
├── llm_service.py
│   ├── extract_with_gemini(image, prompt) → Dict
│   ├── extract_with_groq(image, prompt) → Dict
│   ├── extract_with_claude(image, prompt) → Dict
│   └── cascade_llm_providers(image) → Dict
│
└── field_extractor.py
    ├── parse_llm_response(response) → IDCardData
    ├── apply_fuzzy_field_mapping(raw_value, field_name) → str
    └── extract_date_variants(date_string) → datetime
```

**Technologies**:
- Tesseract (Python wrapper)
- EasyOCR (fallback)
- Anthropic SDK, OpenAI SDK, Groq SDK

---

### Service 5: Rendering Engine Service
**Responsibilities**: PDF/image generation, QR codes

**Python Package Structure**:
```python
engines/rendering/
├── pdf_generator.py
│   ├── generate_id_pdf(data, template) → bytes
│   ├── render_front_page(data) → bytes
│   ├── render_back_page(data, qr_data) → bytes
│   └── _apply_template_styling(canvas, data)
│
├── qr_generator.py
│   ├── generate_qr_code(data, error_correction='H') → Image
│   └── render_qr_on_template(qr_image, template) → Image
│
└── image_processor.py
    ├── normalize_image(image: bytes, target_w, target_h) → bytes
    ├── enhance_contrast(image) → bytes
    ├── remove_alpha_channel(image, bg_color) → bytes
    └── optimize_for_export(image, quality=85) → bytes
```

**Technologies**:
- WeasyPrint (HTML/CSS → PDF)
- Pillow (image manipulation)
- qrcode library

---

### Service 6: Export Service
**Responsibilities**: CSV/JSON/ZIP export, batch processing

**Endpoints**:
- POST /api/jobs/{id}/export
- POST /api/jobs/batch-export

**Technologies**:
- Pandas (CSV generation)
- JSON serialization
- ZipFile (archive creation)

---

### Service 7: Payment Service
**Responsibilities**: Credit packages, transactions, webhook handling

**Endpoints**:
- GET /api/packages
- POST /api/payments/purchase
- POST /api/payments/webhook/stripe (webhook receiver)

**Dependencies**:
- Database (Package, Transaction, CreditLog)
- Stripe API SDK
- Email Service (purchase confirmations)
- Celery (async credit issuance)

---

## Part 8: Implementation Phases

### **Phase 1: MVP (Weeks 1-4)**
Core extraction pipeline without cloud AI

**Deliverables**:
- Django project setup + models
- Local OCR engine (Tesseract)
- Barcode detection (OpenCV + Pyzbar)
- Job orchestration with Celery
- PDF upload & export
- User authentication (JWT)
- Basic admin panel

**Tech Stack**:
- Django + DRF
- Celery + Redis
- PostgreSQL
- Tesseract
- OpenCV

**No external APIs required** ✓

---

### **Phase 2: Cloud AI Integration (Weeks 5-8)**
Add LLM-based extraction with fallback cascade

**Deliverables**:
- LLM service wrapper (Gemini, Groq, Claude)
- Confidence-weighted merge logic
- Fallback cascade strategy
- Extraction confidence scoring
- Quality metrics dashboard

**Tech Stack**:
- Anthropic, OpenAI, Groq SDKs
- Redis caching (API rate limit state)

---

### **Phase 3: Payment & Monetization (Weeks 9-12)**
Credit system, packages, Stripe integration

**Deliverables**:
- Credit package management
- Stripe integration + webhooks
- Credit deduction logic per job
- Payment transaction audit trail
- Email notifications

**Tech Stack**:
- Stripe Python SDK
- SendGrid (email)

---

### **Phase 4: Advanced Features (Weeks 13-16)**
Rendering, batch export, monitoring

**Deliverables**:
- PDF card generation with QR codes
- Batch export (CSV, JSON, ZIP)
- Advanced image preprocessing
- Background removal (ISNet)
- Sentry/DataDog monitoring

**Tech Stack**:
- WeasyPrint
- PyTorch for ISNet model
- Sentry SDK
- DataDog agent

---

### **Phase 5: Production Hardening (Weeks 17-20)**
Scaling, reliability, compliance

**Deliverables**:
- Kubernetes deployment configs
- Load testing & optimization
- GDPR compliance (data retention, deletion)
- Audit logging system
- Rate limiting per user/IP
- Admin dashboard enhancements

**Tech Stack**:
- Kubernetes manifests
- Locust (load testing)
- ELK Stack (centralized logging)

---

## Part 9: Environment Configuration

### .env.example
```bash
# Django
DEBUG=False
SECRET_KEY=your-secret-key-min-50-chars
ALLOWED_HOSTS=localhost,127.0.0.1,api.example.com
DJANGO_SETTINGS_MODULE=config.settings.production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fayda
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=fayda-uploads
AWS_S3_REGION_NAME=us-east-1

# Frontend
FRONTEND_URL=http://localhost:3000
FRONTEND_CALLBACK_URL=http://localhost:3000/auth/callback

# Authentication
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# OAuth (Google)
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# LLM APIs
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
ANTHROPIC_API_KEY=your-anthropic-key

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@example.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=your-datadog-key

# OCR
TESSERACT_PATH=/usr/bin/tesseract
LANGUAGE_PACK_PATHS=/usr/share/tesseract-ocr/4.00/tessdata

# Features
FEATURE_CLOUD_AI=True
FEATURE_BACKGROUND_REMOVAL=True
FEATURE_BATCH_EXPORT=True
FEATURE_ADMIN_PANEL=True

# Quotas
UPLOAD_FILE_SIZE_MB=50
MAX_JOBS_PER_HOUR_FREE=5
MAX_JOBS_PER_HOUR_PRO=100
CREDITS_PER_JOB=1
FREE_TRIAL_CREDITS=3

# Data retention
DEFAULT_DATA_RETENTION_DAYS=90
MIN_DATA_RETENTION_DAYS=30
MAX_DATA_RETENTION_DAYS=365
```

---

## Part 10: Deployment Architecture

### Local Development (Docker Compose)
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/fayda
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=True
    depends_on:
      - db
      - redis
      - celery

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=fayda
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  celery:
    build: .
    command: celery -A config worker -l info
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/fayda
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=True
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A config beat -l info
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/fayda
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=True
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  redis_data:
```

### Production (Kubernetes)

**Key components**:
- Django app deployment (Gunicorn + multiple replicas)
- Celery worker deployment (autoscaling)
- PostgreSQL StatefulSet
- Redis StatefulSet
- Nginx Ingress Controller
- HPA (Horizontal Pod Autoscaler) for workers

---

## Part 11: Monitoring & Observability

### Key Metrics to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| **API Response Time** | DataDog | >1000ms (p95) |
| **Job Processing Time** | CloudWatch | >60s (average) |
| **Celery Queue Depth** | Redis | >100 pending tasks |
| **Database Connections** | CloudWatch | >80% of pool |
| **Error Rate** | Sentry | >1% of requests |
| **OCR Confidence** | Custom | <0.6 average |
| **S3 Costs** | CloudWatch | >$500/month |
| **Redis Memory** | Redis CLI | >80% used |

### Logging Strategy
```python
# Each request logs:
- request_id (unique)
- user_id
- endpoint
- method
- status_code
- response_time_ms
- job_id (if applicable)
- errors (if any)

# Each Celery task logs:
- task_name
- task_id
- start_time, end_time
- status (success/failure)
- parameters (sanitized)
- errors (full traceback)
```

---

## Summary Table: Frontend → Backend Mapping

| Frontend Feature | Backend Service | Key Technology |
|-----------------|-----------------|----------------|
| Local OCR (Tesseract.js) | OCR Service | Tesseract Python wrapper |
| Face Detection (MediaPipe) | Detection Service | MediaPipe Python + MTCNN |
| Barcode/QR scanning | Detection Service | Pyzbar + OpenCV |
| Cloud LLM extraction | Inference Service | Gemini/Groq/Claude SDKs |
| PDF upload & parsing | Job Service | PyPDF2, PDF2image |
| Card rendering (html2canvas) | Rendering Service | WeasyPrint, Pillow |
| Export (PNG/PDF) | Export Service | reportlab, Pillow |
| User auth (JWT) | User Service | PyJWT, Django auth |
| Credit system | Payment Service | Stripe SDK, Django models |
| Job polling | Job Service | WebSocket (optional) or HTTP polling |

---

## Conclusion

This backend architecture provides:

✅ **Scalability**: Microservices + async Celery tasks + Kubernetes-ready
✅ **Reliability**: Multi-stage pipeline with fallback strategies
✅ **Cost-Efficient**: Offline-first with optional cloud AI
✅ **Maintainability**: Clear service boundaries, comprehensive logging
✅ **Compliance**: Audit trail, data retention policies, GDPR-ready
✅ **Developer Experience**: Django + DRF, extensive test fixtures, local Docker setup
