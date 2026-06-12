# Frontend-to-Backend Integration Guide
# Complete API Contract & Data Flow

## Part 1: Layered Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          UI LAYER (Next.js 14)                           │
│                                                                           │
│  UploadStep → ExtractStep → EditStep → PreviewStep → DownloadStep       │
│     (PDF)      (Detection)   (Manual)   (Render)     (Export)            │
│                                                                           │
│  Components: UploadPanel, ExtractStep, EditStep, PreviewStep            │
│  State: StepIndicator, Provider context, useState hooks                 │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ (HTTP REST API)
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│                     API GATEWAY & ORCHESTRATION                          │
│                                                                           │
│  • Authentication middleware (JWT verification)                         │
│  • Request validation (rate limits, file size)                          │
│  • Response transformation (error handling)                             │
│  • CORS & security headers                                              │
│  • Audit logging                                                        │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼───────┐  ┌─────▼──────────┐
│ DETECTION    │  │ INFERENCE      │  │ RENDERING      │
│ LAYER        │  │ LAYER          │  │ LAYER          │
│              │  │                │  │                │
│ Barcode/QR   │  │ • OCR (Tess)   │  │ • PDF gen      │
│ Face detect  │  │ • LLM cascade  │  │ • Image export │
│ Text regions │  │ • Vision API   │  │ • QR codes     │
│              │  │ • Confidence   │  │                │
│              │  │   scoring      │  │                │
└────────┬─────┘  └────────┬───────┘  └────────┬───────┘
         │                 │                   │
         │    ┌────────────┼───────────────┐   │
         │    │            │               │   │
         │    ▼            ▼               ▼   │
         └─► CELERY TASK QUEUE (Redis/RabbitMQ)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼───────┐  ┌─────▼──────────┐
│ USER SERVICE │  │ PAYMENT        │  │ STORAGE        │
│              │  │ SERVICE        │  │ SERVICE        │
│ Auth         │  │                │  │                │
│ Profiles     │  │ • Credits      │  │ • S3/GCS       │
│ Quotas       │  │ • Packages     │  │ • Uploads      │
│              │  │ • Stripe       │  │ • Results      │
└────────┬─────┘  └────────┬───────┘  └────────┬───────┘
         │                 │                   │
         └─────────────────┼───────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │      DATA PERSISTENCE LAYER        │
        │  PostgreSQL + Redis + S3            │
        └───────────────────────────────────┘
```

---

## Part 2: Detailed Data Flow

### Upload Flow

```
FRONTEND:                          BACKEND:
┌────────────────┐
│ User selects   │
│ PDF file       │
└────────┬───────┘
         │
         ├──► File validation (size, format)
         │
         ▼
┌────────────────┐
│ POST /api/jobs │   ──multipart/form-data──►  ┌─────────────────────┐
│ + PDF file     │                             │ Endpoint: POST /jobs │
└────────┬───────┘                             │                     │
         │                                     │ 1. Validate PDF     │
         │◄─────────────────────────────────── │    (magic numbers)  │
         │                                     │                     │
         │ Response (202 Accepted):            │ 2. Extract pages    │
         │ {                                   │    → PNG images     │
         │   "id": 42,                         │                     │
         │   "status": "queued",               │ 3. Normalize to     │
         │   "progress_percent": 0             │    2000×1300        │
         │ }                                   │                     │
         │                                     │ 4. Create Job:      │
         │                                     │    status=queued    │
         │                                     │                     │
         │                                     │ 5. Queue task:      │
         │                                     │    upload_job(42)   │
         │                                     │    on Celery        │
         └─────────────────────────────────────┤                     │
                                               │ 6. Return Job ID   │
                                               └─────────────────────┘
                                                       │
                                                       ▼
                                               ┌─────────────────────┐
                                               │ Celery Worker #1    │
                                               │                     │
                                               │ Task: upload_job    │
                                               │ (status → preproc)  │
                                               │                     │
                                               │ • Cache images      │
                                               │ • Deskew pages      │
                                               │ • Queue extraction  │
                                               └─────────────────────┘
```

### Extraction Flow (Parallel Processing)

```
┌─────────────────┐
│ Celery Task:    │
│ extract_job(42) │  (status → processing)
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬─────────────┐
    │           │          │             │
    ▼           ▼          ▼             ▼
┌───────┐  ┌───────┐  ┌───────┐  ┌────────────┐
│ OCR   │  │ Cloud │  │Barcode│  │ Face Crop  │
│(Tess.)│  │ LLM   │  │Detect │  │+ BG Removal│
└───┬───┘  └───┬───┘  └───┬───┘  └────┬───────┘
    │          │          │           │
    │ Returns: │ Returns: │ Returns:  │ Returns:
    │ {text}   │ {data}   │ {data}    │ {PNG URL}
    │ +conf    │ +conf    │ +conf     │
    │          │          │           │
    └────┬─────┴────┬─────┴───┬───────┘
         │          │         │
         ▼          ▼         ▼
    ┌──────────────────────┐
    │ Merge Results        │
    │ (confidence-weighted)│
    │                      │
    │ Cloud(0.9) > OCR     │
    │ (0.6-0.85) >         │
    │ Barcode(0.75)        │
    └──────┬───────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ ExtractionResult:   │
    │ {                   │
    │   "fin": "1234...", │
    │   "name_en": "John" │
    │   ... (19 fields)   │
    │   "confidences": {} │
    │ }                   │
    │                     │
    │ Update Job:         │
    │ status → completed  │
    │ extraction_result   │
    │ saved to DB         │
    └─────────────────────┘
```

### Edit & Manual Corrections

```
FRONTEND:
User views extraction results
in EditStep component

Field incorrect?
↓ YES
┌─────────────────────┐
│ PATCH /api/jobs/42  │  ──────► ┌──────────────────┐
│ {                   │          │ Update Job       │
│   "extraction_      │          │ • Save edits     │
│    result": {       │          │ • Create audit   │
│      "data": {...}  │          │   log entry      │
│    }                │          │ • Increment      │
│ }                   │          │   edit counter   │
└─────────────────────┘          └──────────────────┘
         │                                │
         ◄────────────────────────────────┘
         │
         ▼
    Updated data
    ready for preview
```

### Rendering & Download Flow

```
User clicks "Generate Card"
         │
         ▼
┌──────────────────────────────────┐
│ Frontend renders:                │
│ • CardPreview component          │
│ • Canvas-based ID card layout    │
│ • Front + back sides             │
│ • QR code on back                │
└──────────────┬───────────────────┘
               │
        ┌──────┴───────┐
        │              │
        ▼              ▼
┌──────────────┐  ┌──────────────────┐
│ User preview │  │ POST /api/jobs/42│
│ via html2    │  │/export           │
│ canvas       │  │                  │
│              │  │ {                │
│ (Optional)   │  │  "format":"pdf"  │
│              │  │ }                │
└──────────────┘  │                  │
                  │ ──────────────────►
                  │                  │
                  │ Celery Task:     │
                  │ generate_export  │
                  │ (status → export)│
                  │                  │
                  │ • Render PDF     │
                  │ • Generate QR    │
                  │ • Upload to S3   │
                  │ • Return URL     │
                  │                  │
                  └──────┬───────────┘
                         │
                  Response (200):
                  {
                    "export_url":
                    "https://s3.../42.pdf"
                  }
                         │
                         ▼
                  ┌───────────────┐
                  │ Browser       │
                  │ downloads PDF │
                  └───────────────┘
```

---

## Part 3: API Request/Response Contracts

### 1. Authentication

#### POST /api/auth/login

**Frontend Call** (from auth.ts actions):
```typescript
// frontend/app/actions/auth.ts
const response = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { access_token, refresh_token, user } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

**Backend Response**:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "credits_balance": 50,
    "tier": "free",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**JWT Token Structure**:
```json
{
  "sub": "user@example.com",
  "user_id": 1,
  "id": 1,
  "email": "user@example.com",
  "role": "user",
  "is_staff": false,
  "iat": 1716734400,
  "exp": 1716820800
}
```

#### POST /api/auth/google

**Frontend Call** (from @react-oauth/google):
```typescript
// Triggered by Google Sign-In button
const response = await fetch(`${API_BASE}/auth/google`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: googleIdToken, // From GoogleLogin credential
  }),
});
```

**Backend Validation**:
- Verify Google ID token with Google's public keys
- Check `email_verified = true`
- Create or update User record
- Return JWT tokens

---

### 2. Job Management

#### POST /api/jobs (Upload & Queue)

**Frontend Call** (from UploadStep.tsx):
```typescript
const formData = new FormData();
formData.append('file', pdfFile); // File object
formData.append('extraction_options', JSON.stringify({
  use_ocr: true,
  use_cloud_ai: true,
  ai_provider: 'gemini', // or 'groq', 'lovable'
}));

const response = await fetch(`${API_BASE}/jobs`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData,
});

const job = await response.json();
// Store job.id for polling
setJobId(job.id);
```

**Backend Validation**:
```python
# api/jobs/views.py
def create_job(request):
    # 1. Check user authentication
    user = request.user  # From JWT middleware
    
    # 2. Check file size (max 50 MB)
    file = request.FILES['file']
    if file.size > 50 * 1024 * 1024:
        raise ValidationError("File too large")
    
    # 3. Check rate limits (free tier: 5/hour)
    recent_jobs = Job.objects.filter(
        user=user,
        created_at__gte=now() - timedelta(hours=1)
    ).count()
    if user.tier == 'free' and recent_jobs >= 5:
        raise RateLimitExceeded()
    
    # 4. Create Job record
    job = Job.objects.create(
        user=user,
        input_file=file,
        status='queued',
        input_file_size=file.size,
    )
    
    # 5. Queue Celery task
    upload_job.delay(job.id)
    
    return Response({'id': job.id, 'status': 'queued'}, status=202)
```

**Response (202 Accepted)**:
```json
{
  "id": 42,
  "status": "queued",
  "progress_percent": 0,
  "created_at": "2026-05-26T10:30:00Z",
  "input_file_size": 1024000,
  "num_pages": 2,
  "estimated_time_seconds": 30
}
```

#### GET /api/jobs/{job_id} (Poll Status)

**Frontend Call** (from ExtractStep.tsx - polling):
```typescript
// Poll every 2 seconds during processing
const pollJob = async () => {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const job = await response.json();
  setProgress(job.progress_percent);
  
  if (job.status === 'completed') {
    setExtractionResult(job.extraction_result);
    clearInterval(pollInterval);
  } else if (job.status === 'failed') {
    setError(job.error_message);
  }
};

useEffect(() => {
  const pollInterval = setInterval(pollJob, 2000);
  return () => clearInterval(pollInterval);
}, [jobId]);
```

**Response (200 OK)**:
```json
{
  "id": 42,
  "status": "completed",
  "progress_percent": 100,
  "extraction_result": {
    "data": {
      "fin": "1234-5678-9012",
      "name_en": "John Doe",
      "name_am": "ጆን ዶ",
      "dob": "1990-01-15",
      "sex": "M",
      "nationality": "Ethiopian",
      "phone": "+251912345678",
      "email": "john@example.com",
      "blood_type": "O+",
      "date_of_expiry": "2030-12-31",
      "fan": "AB123456789012",
      "region": "Addis Ababa",
      "zone": "Addis Ababa",
      "woreda": "Addis Ababa",
      "kebele": "Kebele 01",
      "house_number": "123",
      "address_am": "አድስ አበባ"
    },
    "confidences": {
      "fin": 0.95,
      "name_en": 0.88,
      "dob": 0.92,
      "sex": 1.0,
      "phone": 0.75,
      "face_photo": 0.65
    },
    "detected_sources": {
      "fin": ["barcode", "ocr"],
      "name_en": ["cloud_ai", "ocr"],
      "dob": ["cloud_ai"],
      "sex": ["ocr"],
      "phone": ["ocr"],
      "face_photo": ["face_detection"]
    },
    "face_photo": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "face_photo_background_removed": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  },
  "processing_time_seconds": 28,
  "credits_consumed": 1
}
```

#### PATCH /api/jobs/{job_id} (Manual Edits)

**Frontend Call** (from EditStep.tsx):
```typescript
const updatedData = {
  ...extractionResult.data,
  name_en: 'Jane Doe', // User corrected this
};

const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    extraction_result: {
      data: updatedData,
    },
  }),
});
```

**Backend Action**:
```python
def update_job(request, job_id):
    job = get_object_or_404(Job, id=job_id, user=request.user)
    
    # Extract old data for audit
    old_data = job.extraction_result.data if job.extraction_result else {}
    new_data = request.data['extraction_result']['data']
    
    # Determine changed fields
    for field, new_value in new_data.items():
        old_value = old_data.get(field)
        if old_value != new_value:
            # Create audit log entry
            AuditLog.objects.create(
                user=request.user,
                action='field_edit',
                resource_type='extraction',
                resource_id=job.id,
                old_values={field: old_value},
                new_values={field: new_value},
                ip_address=request.META['REMOTE_ADDR'],
            )
    
    # Update extraction result
    job.extraction_result.data = new_data
    job.extraction_result.manual_edits_count += 1
    job.extraction_result.save()
    
    return Response(job_serializer.data)
```

**Response (200 OK)**:
```json
{
  "id": 42,
  "status": "completed",
  "extraction_result": { ... updated data ... }
}
```

#### POST /api/jobs/{job_id}/export (Generate Export)

**Frontend Call** (from DownloadStep.tsx):
```typescript
// User selects format and clicks "Download"
const response = await fetch(`${API_BASE}/jobs/${jobId}/export`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    format: 'pdf', // or 'png', 'csv', 'json'
  }),
});

const { export_url } = await response.json();

// Trigger browser download
window.location.href = export_url;
```

**Backend Processing**:
```python
def export_job(request, job_id):
    job = get_object_or_404(Job, id=job_id, user=request.user)
    
    # Check credits (export might cost credits)
    if request.user.credits_balance < 1:
        raise InsufficientCredits()
    
    # Queue Celery task for heavy lifting
    format = request.data['format']
    task = generate_export.delay(job_id, format)
    
    return Response({
        'task_id': task.id,
        'status': 'processing',
    }, status=202)
```

**Celery Task**:
```python
# workers/tasks.py
@shared_task
def generate_export(job_id, format):
    job = Job.objects.get(id=job_id)
    extraction = job.extraction_result
    
    if format == 'pdf':
        pdf_bytes = PDFGenerator.generate(extraction.data)
        filename = f"id_card_{job.user.id}_{job_id}.pdf"
    elif format == 'csv':
        csv_bytes = CSVExporter.export([extraction.data])
        filename = f"extraction_{job_id}.csv"
    
    # Upload to S3
    s3_url = StorageService.upload(
        filename,
        pdf_bytes,
        bucket='exports',
    )
    
    # Update Job
    job.result_file = s3_url
    job.save()
    
    # Deduct credits
    Transaction.objects.create(
        user=job.user,
        operation='export',
        credits=-1,
    )
    job.user.credits_balance -= 1
    job.user.save()
    
    return s3_url
```

**Response (202 Accepted)**:
```json
{
  "task_id": "e4f6a8b2-1234-5678-abcd-ef1234567890",
  "status": "processing"
}
```

Then **poll** `/api/jobs/{job_id}/export/{task_id}` for completion:
```json
{
  "status": "completed",
  "export_url": "https://s3.amazonaws.com/fayda-exports/id_card_1_42.pdf",
  "file_size_bytes": 125000,
  "expires_at": "2026-06-26T10:30:00Z"
}
```

---

### 3. User Endpoints

#### GET /api/users/me

**Frontend Call** (on app initialization):
```typescript
// Check current user from token
useEffect(() => {
  if (!accessToken) return;
  
  fetch(`${API_BASE}/users/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  .then(r => r.json())
  .then(user => setCurrentUser(user));
}, [accessToken]);
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+251912345678",
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

**Frontend Call** (from dashboard header):
```typescript
// Quick balance check
const balanceResponse = await fetch(`${API_BASE}/users/me/balance`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

**Response (200 OK)**:
```json
{
  "credits_balance": 50,
  "jobs_remaining_at_current_rate": 50,
  "last_updated": "2026-05-26T10:30:00Z"
}
```

---

### 4. Package & Payment Endpoints

#### GET /api/packages

**Frontend Call** (when user views "Buy Credits"):
```typescript
const packagesResponse = await fetch(`${API_BASE}/packages`);
const packages = await packagesResponse.json();
```

**Response (200 OK)**:
```json
{
  "results": [
    {
      "id": 1,
      "name": "Starter Pack",
      "credits": 100,
      "price_usd": "9.99",
      "discount_percent": 0,
      "is_active": true
    },
    {
      "id": 2,
      "name": "Pro Pack",
      "credits": 500,
      "price_usd": "39.99",
      "discount_percent": 5,
      "is_active": true
    },
    {
      "id": 3,
      "name": "Enterprise",
      "credits": 5000,
      "price_usd": "299.99",
      "discount_percent": 20,
      "is_active": true
    }
  ]
}
```

#### POST /api/payments/purchase

**Frontend Call** (when user clicks "Buy"):
```typescript
const response = await fetch(`${API_BASE}/payments/purchase`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    package_id: 2,
    payment_method: 'stripe',
  }),
});

const { stripe_checkout_url } = await response.json();
window.location.href = stripe_checkout_url; // Redirect to Stripe
```

**Response (201 Created)**:
```json
{
  "id": 1,
  "status": "pending",
  "stripe_checkout_url": "https://checkout.stripe.com/pay/cs_test_1234567890",
  "expires_at": "2026-05-26T11:30:00Z"
}
```

#### POST /api/payments/webhook/stripe (Webhook Receiver)

**Stripe Sends**:
```json
{
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_1234567890",
      "amount": 3999,  // cents
      "currency": "usd",
      "customer": "cus_1234567890",
      "metadata": {
        "user_id": 1,
        "package_id": 2
      }
    }
  }
}
```

**Backend Action**:
```python
@webhook_view
def stripe_webhook(request):
    event = json.loads(request.body)
    
    if event['type'] == 'charge.succeeded':
        user_id = event['data']['object']['metadata']['user_id']
        package_id = event['data']['object']['metadata']['package_id']
        
        user = User.objects.get(id=user_id)
        package = CreditPackage.objects.get(id=package_id)
        
        # Create transaction
        transaction = Transaction.objects.create(
            user=user,
            package=package,
            amount_usd=event['data']['object']['amount'] / 100,
            credits_granted=package.credits,
            status='completed',
            stripe_payment_id=event['data']['object']['id'],
        )
        
        # Add credits
        user.credits_balance += package.credits
        user.save()
        
        # Log credit addition
        CreditLog.objects.create(
            user=user,
            operation='purchase',
            amount=package.credits,
            balance_after=user.credits_balance,
            related_transaction=transaction,
        )
        
        # Send confirmation email
        send_purchase_email.delay(user.id, transaction.id)
    
    return Response({'status': 'ok'})
```

---

## Part 4: Error Handling

### Standard Error Response Format

```json
{
  "detail": "User does not have permission to access this resource",
  "code": "PERMISSION_DENIED",
  "status": 403,
  "timestamp": "2026-05-26T10:30:00Z"
}
```

### Common HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| 200 | Successful GET/PATCH | User data retrieved |
| 201 | Resource created | Job created (POST /jobs) |
| 202 | Accepted (async) | Job queued for processing |
| 400 | Bad request | Invalid file format |
| 401 | Unauthorized | Missing JWT token |
| 402 | Payment required | Insufficient credits |
| 403 | Forbidden | User trying to access another user's job |
| 404 | Not found | Job ID doesn't exist |
| 409 | Conflict | Duplicate email on signup |
| 429 | Rate limited | Too many requests in 1 hour |
| 500 | Server error | Celery task failed |
| 503 | Service unavailable | Tesseract service down |

---

## Part 5: Backend Tech Stack Justification

| Component | Technology | Why |
|-----------|-----------|-----|
| **Framework** | Django 4.2 + DRF | Proven production framework, ORM handles complexity, extensive middleware ecosystem |
| **Async Queue** | Celery 5.3 | Handles long-running tasks (PDF extraction, LLM calls), scales horizontally |
| **Message Broker** | Redis 7 | Fast, reliable, built-in support for rate limiting + caching |
| **Database** | PostgreSQL 15 | JSONB for flexible extraction results, full-text search, ACID guarantees |
| **File Storage** | AWS S3 | Scalable, cheap, integrates with CDN, automatic lifecycle policies |
| **OCR** | Tesseract 5 | Proven accuracy for English + Amharic, field-specific tuning possible |
| **LLM Provider** | Multi-provider (Gemini, Groq, Claude) | Reduces vendor lock-in, automatic failover |
| **Payment** | Stripe | Global reach, webhook support, refund automation |
| **Monitoring** | Sentry + DataDog | Real-time error tracking, performance insights |
| **Container** | Docker | Reproducible builds, multi-stage for optimization |

---

## Part 6: Performance Targets

| Metric | Target | Current | Optimization Strategy |
|--------|--------|---------|----------------------|
| **Upload API Response** | <1 second | ? | Async file validation, stream uploads |
| **Job Extraction Time** | <30 seconds | ? | Parallel Celery workers, Redis caching |
| **Export PDF Generation** | <5 seconds | ? | Cached templates, background generation |
| **Database Query Time** | <100ms (p95) | ? | Proper indexing, connection pooling |
| **LLM API Response** | <10 seconds (p95) | ? | Timeout + fallback cascade |
| **Celery Task Duration** | <60 seconds | ? | Task time budgets, worker autoscaling |

---

## Summary: Frontend-Backend Contract

✅ **Frontend sends** → **Backend receives** → **Backend processes** → **Frontend receives**

- PDF file → Validates + queues → Extracts data asynchronously → Job ID + polling URL
- Poll status → Returns progress + results → When ready, returns ExtractionResult
- Manual edits → Validates + saves → Updates database + audit log → Returns confirmation
- Export request → Queues PDF generation → Generates + uploads to S3 → Returns download URL

This layered architecture ensures:
- **Scalability**: Heavy work offloaded to Celery
- **Reliability**: Multi-stage pipeline with fallbacks
- **User Experience**: Responsive API with background processing
- **Maintainability**: Clear separation of concerns across 7 services
