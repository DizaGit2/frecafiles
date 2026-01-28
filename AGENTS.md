# FRECA Files - Project Notes

## Overview
- Angular (standalone components) + Angular Material UI.
- Supabase backend: Auth (email/password + invite), Postgres, Storage (private bucket, signed URLs).
- Roles: `administrator`, `client`.
- Auth flow:
  - Admin lands on `/admin/clientes`, client on `/client/archivos`.
  - Invite flow handled by Supabase Edge Function `invite-client` and an in-app invite acceptance screen.
- Storage:
  - Private bucket; signed URLs are generated for preview/download.
  - Max upload size defined in `src/app/core/constants/app.constants.ts`.
- Port: dev server runs on `http://localhost:4300`.

## Key Paths
- App entry: `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`.
- Supabase client: `src/app/core/services/supabase.client.ts`.
- Auth service: `src/app/core/services/auth.service.ts`.
- Profiles service: `src/app/core/services/profile.service.ts`.
- Files service: `src/app/core/services/file.service.ts`.
- Admin clients UI: `src/app/features/admin/clients/admin-clients.component.ts`.
- Admin files UI: `src/app/features/admin/files/admin-files.component.ts`.
- Add file modal (async client search): `src/app/features/admin/files/add-file-dialog.component.ts`.
- Invite edge function: `supabase/functions/invite-client/index.ts`.

## Supabase Notes
- Schema + RLS in `supabase/schema.sql` and `supabase/storage.sql`.
- `profiles` uses `is_active` for soft-delete; do not delete auth users or files.
- Edge function requires CORS for localhost (already configured).

## E2E Tests (Playwright)
- Config: `playwright.config.ts` (uses port 4300).
- Tests:
  - `e2e/login.spec.ts`
  - `e2e/admin.spec.ts`
  - `e2e/client.spec.ts`
  - `e2e/invite.spec.ts`
  - `e2e/add-file-modal.spec.ts` (async client select)
  - `e2e/table-filters.spec.ts` (filters + tables)
- Cleanup added to E2E tests to delete created users/files.

## Env Files
- `.env` contains placeholders only.
- `.env.local` holds actual secrets (ignored by git).

## Recent Fixes
- Added `CommonModule` to standalone components using `*ngFor`.
- Add-file modal uses `mat-autocomplete` + chips with async search and top-10 results.
- Invite flow: `exchangeCodeForSession` and `setSession` to finalize invite acceptance.
- Fixed auth lock issue by disabling Navigator lock in supabase client.

## TODO
- Review UI polish for dark theme consistency across all pages.
- Add explicit cleanup for older E2E test artifacts in Supabase (optional).
- Verify file upload end-to-end in production storage bucket with signed URL expiration.
- Add client-side tests for the invite acceptance screen (optional).
