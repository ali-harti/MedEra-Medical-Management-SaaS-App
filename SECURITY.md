# Security Policy

## Overview

MedEra is an open-source medical management SaaS platform built for solo practitioners and small clinics. Because this application processes sensitive electronic protected health data (patient identifiers, appointments, consultation notes, and prescriptions), security and privacy are core engineering considerations.

> **Note**: MedEra is currently a portfolio demonstration project intended for local evaluation and research. It is **not** deployed as a public production healthcare system.

---

## Supported Versions

Only the latest commit on the `main` branch is actively maintained with security patches.

| Version / Branch | Supported | Release Type |
| :--- | :---: | :--- |
| `main` / latest | ✅ | Active Development & Portfolio Release |
| Earlier tags / forks | 🔲 | Deprecated |

---

## Reporting a Vulnerability

We take all reports of security vulnerabilities seriously. If you discover a security issue or vulnerability in MedEra, please follow these steps:

1. **Do not create a public GitHub issue** for undisclosed security vulnerabilities.
2. Send an email directly to the project maintainer:
   - **Contact**: `aliharti248@gmail.com`
   - **Subject**: `[SECURITY] MedEra Vulnerability Report - <Brief Summary>`
3. Include the following details in your report:
   - Type of vulnerability (e.g., Broken Access Control, Authentication Bypass, Injection, Information Disclosure).
   - Component affected (`backend/`, `Medera-Frontend/`, `ai_service/`, `whatsapp_agent/`, `nginx/`, or Docker configuration).
   - Step-by-step instructions or Proof of Concept (PoC) to reproduce the issue.
   - Potential impact and severity assessment.
   - Proposed remediation or patch (if available).

### Response Timeline

- **Initial Acknowledgment**: Within 48 hours of receipt.
- **Triage & Validation**: Within 5 business days.
- **Fix & Public Advisory**: Coordinated disclosure after a fix is prepared and verified.

---

## Vulnerability Scope

### In-Scope
- Authentication vulnerabilities (JWT validation, session tampering, password policy bypass).
- Authorization flaws (horizontal or vertical privilege escalation, broken object-level authorization across clinic tenants).
- Data leakage of health records (PHI/PII exposure through APIs or diagnostic pipelines).
- Injection vulnerabilities (SQL injection, command injection, path traversal in PDF generation or model loading).
- Server-side request forgery (SSRF) and insecure service-to-service communication.
- Insecure direct object references (IDOR) on patient files, consultations, or prescriptions.

### Out-of-Scope
- Vulnerabilities affecting local self-signed TLS certificates when running in development mode.
- Denial of Service (DoS) attacks on local Docker containers.
- Social engineering against clinic staff or users.
- Issues related to third-party infrastructure (Twilio API downtime, Groq API outages, OpenAI status).

---

## Security Practices for Contributors

- Never commit `.env` files, production credentials, API keys, or database dumps to git.
- Ensure all new API endpoints apply appropriate Django REST Framework permission classes (`IsAuthenticated`, `IsMedecin`, `IsMedicalStaff`, or `IsAdminUser`).
- Always enforce tenant scoping in `get_queryset()` using `cabinet_doctor` or `patient__user`.
- Ensure clinical notes and personally identifiable information (PII) are scrubbed before transmitting payloads to external LLMs or microservices.
