# Phase-0 quick verification checklist

## Required env vars
- `DATABASE_URL`
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (fallback for login)
- `SUPABASE_JWT_SECRET` (`SUPABASE_JWT_AUD`/`SUPABASE_JWT_ISS` optional)
- `REDIS_URL` (optional for workers)

## Migrations
```bash
cd backend
alembic upgrade head
```

## Run API
```bash
cd backend
uvicorn backend.app.main:app --reload
```

## Signup (creates Supabase user + org + membership)
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"Str0ngP@ss!","organization_name":"Acme"}'
```
Expect `201` with `id/email/role/organization_id`.

## Login (Supabase password -> internal JWT)
```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=owner@example.com&password=Str0ngP@ss!"
```
Expect `access_token` + `token_type=bearer`.

## Authenticated calls
Use the returned token:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/projects
```
Should return projects for the caller’s organization (empty list on fresh DB).
