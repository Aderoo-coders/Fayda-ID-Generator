# Fayda ID Processing Platform

Production-ready multi-client platform for Fayda ID processing with:
- Next.js web frontend
- Django API backend with JWT
- Celery async processing worker
- Redis queue
- PostgreSQL database
- MinIO/S3 object storage
- Telegram bot client

## Architecture

- **Frontend (`frontend`)**: Landing page + upload UX.
- **Backend API (`backend`)**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/process-id`
  - `GET /api/job/<id>`
  - `GET /api/download/<id>`
- **Processing Engine (`backend/apps/jobs`)**:
  1. Image preprocess (OpenCV)
  2. Face detection/crop
  3. Background removal (`rembg`)
  4. OCR (`PaddleOCR`, fallback `pytesseract`)
  5. Smart field parsing (regex)
  6. Template rendering (PIL)
  7. QR generation
  8. PDF export
  9. Store result in S3/MinIO
- **Telegram Bot (`telegram-bot`)**:
  - Receives image
  - Calls backend `/process-id`
  - Polls `/job/<id>`
  - Returns download link

## Data Model

- `users`: auth users and optional telegram linkage
- `jobs`: processing state and result URL
- `extracted_data`: parsed OCR fields

## Quick Start (Docker)

1. Copy `.env.example` to `.env` and update secrets.
2. Start stack:
   ```bash
   docker compose --env-file .env up --build
   ```
3. Open:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:8000](http://localhost:8000)
   - MinIO console: [http://localhost:9001](http://localhost:9001)

## Production Notes

- Replace development secrets and credentials.
- Place Django behind Gunicorn + reverse proxy (Nginx/ALB).
- Enable HTTPS and secure cookie/CORS policies.
- Add observability (Sentry, Prometheus, structured logs).
- Configure Celery autoscaling and separate worker queues.
- Add bucket lifecycle rules and signed URLs for secure downloads.

## Advanced Extension Points

- YOLO-based field detection
- Multi-template ID layouts
- Admin dashboard and analytics
- Payment integration and usage metering
