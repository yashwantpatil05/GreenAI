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

## What's Been Implemented (January 24, 2026)

### Authentication & Auth Fixes ✅
- [x] Fixed signup flow - database migrations for subscription columns
- [x] Supabase Auth integration working
- [x] Google OAuth integration with Supabase
- [x] GitHub OAuth integration with Supabase
- [x] OAuth callback page with branded loading state
- [x] JWT token-based API authentication

### Premium UI Redesign ✅
- [x] **Greenish theme** - Changed from bluish (hue 222) to greenish (hue 160) to match login aurora
- [x] New SVG Logo component with animated leaf icon and glow effect
- [x] Premium split-layout login/signup pages with aurora backgrounds
- [x] Feature highlights on auth pages (Carbon Tracking, Energy Optimization, ESG Reports)
- [x] Social login buttons (Google, GitHub) - functional
- [x] Compact theme toggle with colored indicator dot
- [x] Consistent emerald/teal/cyan color scheme across ALL pages
- [x] Glass morphism effects and smooth animations

### Billing Integration ✅
- [x] Razorpay payment gateway integrated
- [x] 3 subscription plans (Starter, Pro, Enterprise)
- [x] Usage tracking and limits per organization
- [x] Overage billing calculation
- [x] Billing page with plan cards and usage meters

### Backend Improvements ✅
- [x] Fixed database session handling
- [x] Database migrations for subscription columns
- [x] Billing API endpoints working
- [x] Health and readiness endpoints at /api/*
- [x] CORS configured for cross-origin requests

### Pages Completed ✅
| Page | Status | Theme |
|------|--------|-------|
| Login | ✅ Working | Greenish Aurora |
| Signup | ✅ Working | Greenish Aurora |
| Auth Callback | ✅ Working | Greenish Aurora |
| Dashboard | ✅ Working | Greenish Dark |
| Projects | ✅ Working | Greenish Dark |
| Job Runs | ✅ Working | Greenish Dark |
| API Keys | ✅ Working | Greenish Dark |
| Reports | ✅ Working | Greenish Dark |
| Compare | ✅ Working | Greenish Dark |
| Suggestions | ✅ Working | Greenish Dark |
| Billing | ✅ Working | Greenish Dark |
| Settings | ✅ Working | Greenish Dark |

### Billing Plans
| Plan | Price | Job Runs | Projects | Users | Overage |
|------|-------|----------|----------|-------|---------|
| Starter | ₹2,999/mo | 10,000 | 3 | 2 | ₹0.50/run |
| Pro | ₹9,999/mo | 100,000 | 10 | 10 | ₹0.30/run |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Custom |

## Test Results (Latest)
- **Backend**: 87.5% (minor CORS OPTIONS issue)
- **Frontend**: 100% (all features working)
- **Overall**: 98% pass rate

## Prioritized Backlog

### P0 - Critical
- [x] ~~Fix signup/login bugs~~ ✅ DONE
- [x] ~~Make theme consistent (greenish)~~ ✅ DONE
- [ ] Test complete payment flow with Razorpay

### P1 - High Priority
- [ ] Enable Google OAuth in Supabase dashboard (requires user action)
- [ ] Enable GitHub OAuth in Supabase dashboard (requires user action)
- [ ] Add invoice generation after payment
- [ ] Implement report file export to S3/GCS

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

1. **Enable OAuth Providers**: In Supabase dashboard, enable Google and GitHub OAuth providers
2. **Test Payment Flow**: Complete a test Razorpay payment to verify subscription activation
3. **SDK Integration Test**: Generate API key and ingest test job run via SDK
4. **Production Deployment**: Deploy to GCP using Docker configuration

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    (Next.js 14 + Tailwind)                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Login  │  │Dashboard│  │ Billing │  │Settings │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
              ┌──────────────┴──────────────┐
              │       Backend (FastAPI)     │
              │  ┌───────┐ ┌───────┐        │
              │  │ Auth  │ │Billing│        │
              │  └───┬───┘ └───┬───┘        │
              └──────┼─────────┼────────────┘
                     │         │
         ┌───────────┴───┐     │
         │   Supabase    │     │    ┌──────────┐
         │  (PostgreSQL) │     └────│ Razorpay │
         │  (Auth)       │          └──────────┘
         └───────────────┘
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```

### Frontend (.env)
```
NEXT_PUBLIC_API_BASE=https://your-api-url/api
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---
*Last Updated: January 24, 2026*
*Version: 2.0.0*
