# Phase-0 Fix Log (GreenAI backend)

## Audit highlights
- `OrganizationMember` was declared twice (`organization.py` and `organization_member.py`), causing duplicate mapper/metadata errors on reload.
- ORM vs DB drift: `users` missing `full_name`/`auth_provider`, strict NOT NULL on `hashed_password`/`role`/`organization_id`, `api_keys` missing org scope/scopes/revoked fields, `projects` missing cloud/region columns, `organization_members` missing `updated_at`.
- Auth stack inconsistent: JWT helpers disabled, deps tried to decode Supabase JWTs while `/api/auth/token` issued nothing, settings omitted Supabase JWT secret/anon key handling, and `.env` loading depended on CWD.

## Fixes
- Consolidated `OrganizationMember` into a single model, cleaned relationships (`Organization.users/projects/members`, `User.memberships`) and model exports to avoid duplicate registrations.
- Normalized ORM schema for `users/organizations/organization_members/projects/api_keys` and added migrations `0003_phase0_alignment` (schema alignment/backfills) and `0004_org_defaults` (org UUID/timestamp defaults for legacy tables).
- Settings/Auth hardened: Pydantic v2 config with root `.env`, required Supabase + JWT secrets, bcrypt hashing restored, internal JWT issuing/decoding implemented, Supabase client now uses secret values safely.
- Signup/login: Supabase admin signup + local org/member bootstrap (owner), Supabase password login now requires existing membership and returns an internal JWT containing `sub/org/role/email`.
- API key creation now scopes to the caller's organization and uses hashed secrets; membership-based role checks enforced via `require_roles`.

## Key files
- Models: `backend/app/models/organization.py`, `organization_member.py`, `user.py`, `project.py`, `api_key.py`
- Auth/config: `backend/app/auth/security.py`, `auth/deps.py`, `api/auth.py`, `core/config.py`
- Services: `backend/app/services/project_service.py`, `user_service.py`, `integrations/supabase_client.py`
- Migrations: `migrations/versions/0003_phase0_alignment.py`, `migrations/versions/0004_org_defaults.py`
- Requirements: `backend/requirements.txt`

## Notes
- Run Alembic to apply `0003_phase0_alignment` and `0004_org_defaults` before starting the app.
- Internal tokens now carry org/role; endpoints expecting `user.organization_id` use the principal from `auth.deps`.
