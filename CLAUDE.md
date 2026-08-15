# MedEra Project - Developer Guide

## Architecture & Infrastructure
- **Backend:** Django 4.2 + DRF, Celery for background tasks.
- **Database/Cache:** PostgreSQL 15, Redis 7.
- **Frontend:** React application running on port 3000.
- **AI Service:** Flask application providing symptom classification (`ai_service/`).
- **External Services:** Mailhog (SMTP interceptor), local WhatsApp service stub.
- **Orchestration:** Managed via Docker Compose (`docker-compose.yml`).

## Quick Start
1. **Environment:** Ensure `.env` is present in the root (created automatically during setup).
2. **Start all services:** 
   ```bash
   docker compose up -d
   ```
3. **Populate Test Users:**
   ```bash
   docker compose exec backend python create_test_users.py
   ```
   *Available test accounts (Password for all is `[Role]123!`):*
   - `admin@medera.com`
   - `medecin@medera.com`
   - `secretaire@medera.com`
   - `patient@medera.com`

## Useful Commands
- **Backend Migrations:** `docker compose exec backend python manage.py migrate`
- **Run Backend Tests:** `docker compose exec backend pytest apps/ -q --tb=short`
- **View Service Logs:** `docker compose logs -f [service_name]` (e.g., `backend`, `ai_service`)

## Known Issues & Current State
- **AI Service:** Originally crashed due to missing `.joblib` model. Hardcoded path in `model.py` was patched to use `clinical_rf_v1.pkl`.
- **Prescriptions PDF:** The PDF generation fails in tests (likely missing `wkhtmltopdf` system dependencies in the backend image).
- **WhatsApp Service:** Currently scaffolded as a dummy Node.js service to satisfy container dependencies without implementing real API hooks yet.
- **Frontend Health:** Frontend health check may intermittently fail or take long to pass depending on Vite's initial load time.
