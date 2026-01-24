# GreenAI Platform - Product Requirements Document

## Overview
GreenAI is an enterprise carbon tracking and ESG reporting platform for AI/ML workloads. It helps organizations monitor, analyze, and optimize the environmental impact of their machine learning operations.

## Original Problem Statement
Fix and polish existing GreenAI application (Next.js frontend + Python FastAPI backend + Supabase). Goals:
- Make UI premium, attractive, and matching the green/sustainability theme
- Fix bugs and ensure all features work correctly
- Add Razorpay billing integration with subscription plans
- Prepare for Docker-based deployment on GCP

## User Personas

### Data Scientist / ML Engineer
- Tracks carbon footprint of training jobs
- Uses SDK/CLI for automatic telemetry
- Compares runs to optimize efficiency

### Platform Engineer
- Manages API keys and project configurations
- Monitors system health and generates reports
- Needs secure, multi-tenant architecture

### Sustainability Manager
- Reviews ESG reports for compliance
- Tracks organizational carbon reduction goals
- Needs high-level dashboards and trends

### Finance/Billing Admin
- Manages subscription plans
- Monitors usage and overage charges
- Reviews billing history

## Core Requirements (Static)

### Authentication & Authorization
- [x] Supabase Auth integration
- [x] JWT-based API authentication
- [x] Organization-scoped multi-tenancy
- [x] Project-level API keys for SDK ingestion

### Project Management
- [x] Create/list projects
- [x] Project-scoped API keys
- [x] Project-level analytics

### Job Run Tracking
- [x] Ingest job run telemetry via API key
- [x] Energy (kWh) and carbon (kgCO2e) tracking
- [x] Hardware and metadata capture
- [x] Status tracking (running, completed, failed)

### Analytics & Reporting
- [x] Dashboard with trends and charts
- [x] Run comparison feature
- [x] ESG report generation
- [x] Optimization suggestions

### Billing (Razorpay)
- [x] Subscription plans (Starter, Pro, Enterprise)
- [x] Usage tracking and limits
- [x] Overage billing
- [x] Payment processing

## What's Been Implemented (January 2026)

### Premium UI Redesign
- [x] New SVG Logo component with leaf icon and animated glow
- [x] Premium split-layout login/signup pages with aurora background
- [x] Feature highlights on auth pages (Carbon Tracking, Energy Optimization, ESG Reports)
- [x] Social login UI (Google, GitHub buttons)
- [x] Compact theme toggle with colored indicator dot
- [x] Consistent emerald/teal/cyan color scheme
- [x] All pages using CSS variables for theming
- [x] Smooth animations and transitions

### Backend Improvements
- [x] Fixed database session handling (removed scoped_session issues)
- [x] Added Razorpay billing service with 3 plans
- [x] Billing API: create order, verify payment, usage stats, overage calculation
- [x] Health endpoints at /api/healthz and /api/readyz
- [x] Proper CORS configuration

### Pages Updated
- [x] Login - Premium split design with feature highlights
- [x] Signup - Premium split design with different features
- [x] Dashboard - New logo in sidebar
- [x] Billing - Full subscription management UI
- [x] All pages - Consistent theme tokens

### Billing Plans
| Plan | Price | Job Runs | Projects | Users | Overage |
|------|-------|----------|----------|-------|---------|
| Starter | ₹2,999/mo | 10,000 | 3 | 2 | ₹0.50/run |
| Pro | ₹9,999/mo | 100,000 | 10 | 10 | ₹0.30/run |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Custom |

## Prioritized Backlog

### P0 - Critical (Before Production)
- [ ] Test signup/login flow end-to-end with real credentials
- [ ] Test job run ingestion via SDK/CLI
- [ ] Verify Razorpay payment flow with test transaction
- [ ] Add production CORS origins

### P1 - High Priority
- [ ] Implement Google/GitHub social auth (currently UI only)
- [ ] Add invoice generation after payment
- [ ] Implement report file export to S3/GCS
- [ ] Add pagination to job runs list

### P2 - Medium Priority
- [ ] SDK offline cache implementation
- [ ] Role-based authorization on endpoints
- [ ] Webhook notifications for events
- [ ] Rate limiting on API endpoints

### P3 - Nice to Have
- [ ] Real-time WebSocket updates
- [ ] Export data to CSV/Excel
- [ ] Custom branding per organization
- [ ] Slack/Teams integrations

## Next Tasks

1. **Test Full Auth Flow**: Create account, login, verify organization creation
2. **Test Billing Flow**: Select plan, complete Razorpay payment, verify subscription activation
3. **Test SDK Integration**: Generate API key, ingest test job run via SDK
4. **Production Hardening**: Configure strict CORS, add rate limiting, enable logging

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Supabase   │
│  (Next.js)  │     │  (FastAPI)  │     │ (Postgres)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   ▼                   │
       │           ┌─────────────┐            │
       │           │  Razorpay   │            │
       │           │  (Billing)  │            │
       │           └─────────────┘            │
       │                                       │
       └───────────────────────────────────────┘
```

## Test Results
- Backend: 83% (health/billing APIs working)
- Frontend: 95% (all pages working, premium UI)
- Overall: 92% pass rate

## Environment Variables

### Backend
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```

### Frontend
```
NEXT_PUBLIC_API_BASE=https://your-api-url/api
```

---
*Last Updated: January 24, 2026*
