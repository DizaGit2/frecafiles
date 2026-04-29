# FRECA Files - Project Notes

## Overview
- Angular (standalone components) + Angular Material UI.
- Supabase backend: Auth (email/password + invite), Postgres, Storage (private bucket, signed URLs).
- Roles: `administrator`, `client`.
- Auth flow:
  - Admin lands on `/admin/clientes`, client on `/client/archivos`.
  - Invite flow handled by Supabase Edge Function `invite-client` and an in-app invite acceptance screen.
  - Password recovery: `/reset-password` route consumes Supabase recovery token and prompts for new password. "Olvide mi contrasena" link on login screen requests the email.
- Storage:
  - Private bucket; signed URLs are generated for preview/download.
  - Max upload size defined in `src/app/core/constants/app.constants.ts`.
- Port: dev server runs on `http://localhost:4300`.
- Production: deployed to GitHub Pages at `https://dizagit2.github.io/frecafiles/` via GitHub Actions on push to `main`.

## Key Paths
- App entry: `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`.
- Supabase client: `src/app/core/services/supabase.client.ts`.
- Auth service: `src/app/core/services/auth.service.ts`.
- Login + password recovery request: `src/app/features/auth/login.component.ts`.
- Password recovery landing screen: `src/app/features/auth/reset-password.component.ts`.
- Profiles service: `src/app/core/services/profile.service.ts`.
- Files service: `src/app/core/services/file.service.ts`.
- Admin clients UI: `src/app/features/admin/clients/admin-clients.component.ts`.
- Admin files UI: `src/app/features/admin/files/admin-files.component.ts`.
- Add file modal (async client search): `src/app/features/admin/files/add-file-dialog.component.ts`.
- Category service: `src/app/core/services/category.service.ts`.
- Category model: `src/app/core/models/category.model.ts`.
- Admin categories UI: `src/app/features/admin/categories/admin-categories.component.ts`.
- Client files UI (card view): `src/app/features/client/files/client-files.component.ts`.
- File type icons utility: `src/app/shared/utils/file-icons.ts`.
- Invite edge function: `supabase/functions/invite-client/index.ts`.

## Supabase Notes
- Schema + RLS in `supabase/schema.sql` and `supabase/storage.sql`.
- `profiles` uses `is_active` for soft-delete; do not delete auth users or files.
- `categories` table: admin-managed, all authenticated users can read. Files have nullable `category_id` FK (`on delete set null`).
- Edge function requires CORS for localhost (already configured).

## E2E Tests (Playwright)
- Config: `playwright.config.ts` (uses port 4300).
- Tests:
  - `e2e/login.spec.ts`
  - `e2e/admin.spec.ts`
  - `e2e/client.spec.ts`
  - `e2e/invite.spec.ts`
  - `e2e/add-file-modal.spec.ts` (async client select)
  - `e2e/table-filters.spec.ts` (filters + tables + INNER join verification)
- Cleanup added to E2E tests to delete created users/files.

## Env Files
- `.env` contains placeholders only.
- `.env.local` holds actual secrets (ignored by git).

## TODO
- [x] Review UI polish for dark theme consistency across all pages.
- [x] Add explicit cleanup for older E2E test artifacts in Supabase.
- [ ] Verify file upload end-to-end in production storage bucket with signed URL expiration.
- [x] Add client-side tests for the invite acceptance screen.
- [x] Set up CI/CD: build + deploy frontend to GitHub Pages on push to `main`.
- [x] Implement password recovery flow.
- [ ] Add Playwright E2E coverage for the password recovery flow.

---

## Deployment - GitHub Pages

### Workflow
`.github/workflows/frontend.yml` — runs on push/PR to `main` and manual `workflow_dispatch`.

**Build job** (always):
1. Checkout, Node 20, `npm ci`
2. Generate `src/environments/environment.ts` and `environment.prod.ts` from secrets (the files are gitignored)
3. `npm run build -- --configuration=production --base-href=/frecafiles/`
4. Copy `index.html` → `404.html` for SPA route fallback (Pages serves `404.html` on unknown paths; Angular router then handles the URL)
5. Upload `dist/freca-files-prod` as Pages artifact

**Deploy job** (push to main only, skipped for PRs):
- `actions/deploy-pages@v4` publishes to `https://dizagit2.github.io/frecafiles/`

### Required secrets (repo Settings → Secrets and variables → Actions)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

`INVITE_FUNCTION_URL` is derived in the workflow as `${SUPABASE_URL%/}/functions/v1/invite-client`.

### One-time repo settings
- **Settings → Pages → Source**: must be set to **"GitHub Actions"** (not the legacy "Deploy from branch").
- Workflow needs `permissions: { contents: read, pages: write, id-token: write }` (already in the file).

### Supabase URL configuration (Authentication → URL Configuration)
- **Site URL**: `https://dizagit2.github.io/frecafiles/`
- **Redirect URLs** (allow-list): include `https://dizagit2.github.io/frecafiles/reset-password` and `http://localhost:4300/reset-password` for dev.
- Without these, Supabase recovery / invite emails will be rejected or land on the wrong host.

### SPA routing under `/frecafiles/` base
- Angular built with `--base-href=/frecafiles/` so asset URLs resolve under the Pages subpath.
- For deep-link refreshes (e.g. `/frecafiles/admin/clientes`), `404.html` is a copy of `index.html` so the SPA bootstraps and the router takes over.
- In code, **never hardcode a redirect URL** — use `Location.prepareExternalUrl('/path')` so it works in dev (`/path`) and prod (`/frecafiles/path`).

---

## UI Design - Glassmorphism Theme

### Design Tokens (CSS Custom Properties)
Located in `src/styles.scss`:
- **Brand colors**: `--freca-gold`, `--freca-amber`, `--freca-cream`, etc.
- **Glass effects**: `--glass-bg`, `--glass-border`, `--glass-blur`
- **Surfaces**: `--surface-0` through `--surface-elevated`
- **Shadows**: `--shadow-sm` through `--shadow-xl`, `--shadow-glow`
- **Transitions**: `--transition-fast`, `--transition-normal`, `--transition-slow`
- **Border radius**: `--radius-sm` through `--radius-full`
- **Spacing**: `--space-xs` through `--space-2xl`

### Key UI Classes
- `.freca-card` - Glass-effect card with backdrop blur
- `.freca-section-title` - Cinzel font, uppercase, gold color
- `.freca-form-grid` - CSS Grid for form fields
- `.freca-form-actions` - Flex container for form buttons (right-aligned)
- `.freca-actions` - Flex container for table action buttons
- `.freca-muted` - Muted text color (ash)

### Material Design Theming
- Uses MDC design tokens for consistent theming
- Snackbar, autocomplete, select, dialog all use glass-effect backgrounds
- Error colors: Light red (`#ff8a80`) for visibility on dark backgrounds

---

## Important Patterns

### 1. Mat-Form-Field Alignment
Angular Material's `mat-form-field` reserves ~22px for subscript (hints/errors) by default. To fix alignment issues:
```html
<mat-form-field appearance="outline" subscriptSizing="dynamic">
```
This removes reserved space when no hint/error is shown.

### 2. Form Layout with Button on Separate Row
For consistent alignment, place the search button on its own row:
```html
<form>
  <div class="freca-form-grid">
    <!-- form fields -->
  </div>
  <div class="freca-form-actions">
    <button mat-stroked-button type="submit">Buscar</button>
  </div>
</form>
```

### 3. Supabase Junction Table Filtering (INNER JOIN)
When filtering by a junction table, use `!inner` to exclude records without matches:
```typescript
// Without filter: LEFT JOIN (shows all files)
.select('*, file_clients(client_user_id, profiles(full_name, email))')

// With filter: INNER JOIN (only files with matching clients)
.select('*, file_clients!inner(client_user_id, profiles(full_name, email))')
```

### 4. Chip-Based Multi-Select Filter
Pattern from `admin-files.component.ts`:
- Use `mat-chip-grid` with `mat-chip-row` for selected items
- Use `mat-autocomplete` for search dropdown
- Store selections in a `Map<string, T>` for O(1) lookup
- Debounce search input with RxJS `debounceTime`

### 5. Icon Buttons with Tooltips
Replace text buttons with icon buttons for cleaner UI:
```html
<button mat-icon-button color="primary" (click)="action()" matTooltip="Action Name">
  <mat-icon>icon_name</mat-icon>
</button>
```
Required imports: `MatIconModule`, `MatTooltipModule`
Required font: Material Icons (in `index.html`)

---

## Recent Session Changes

### Files Search Screen Fixes
1. **Chip-based multi-client filter** - Replaced single-select dropdown with chip-based multi-select
2. **Clients column in files table** - Shows all associated clients for each file
3. **INNER JOIN for filtering** - Files without matching clients are excluded when filtering
4. **Button alignment** - Moved search button to separate row, aligned right

### Visual Improvements
1. **Icon buttons** - Replaced text action buttons with icon buttons + tooltips
2. **Material Icons** - Added Google Material Icons font to `index.html`

### Files Modified
- `src/index.html` - Added Material Icons font
- `src/styles.scss` - Added `.freca-form-actions` class, glassmorphism design tokens
- `src/app/features/admin/clients/admin-clients.component.ts` - Icon buttons, form layout
- `src/app/features/admin/files/admin-files.component.ts` - Chip filter, icon buttons, form layout
- `src/app/features/admin/files/admin-files.component.scss` - Client filter field styling
- `src/app/core/services/file.service.ts` - Conditional INNER JOIN, client profiles in response
- `src/app/core/models/file.model.ts` - Added `clients` array to `FileRecord`
- `e2e/table-filters.spec.ts` - Updated for chip-based filter, added INNER join test

### Category System & Client Card View
1. **Dynamic categories** - Admin-managed categories with CRUD at `/admin/categorias`
2. **Category on files** - Files have `category_id` FK; required when uploading via add-file-dialog
3. **Category column** - Admin files table shows category badge column
4. **Client card view** - Replaced table with sidebar (categories) + responsive card grid
5. **File type icons** - Cards show Material Icons based on file extension (`src/app/shared/utils/file-icons.ts`)
6. **Default category** - Existing files backfilled to "General" category

### New Files
- `src/app/core/models/category.model.ts` - Category interface
- `src/app/core/services/category.service.ts` - Category CRUD + file count per category
- `src/app/features/admin/categories/admin-categories.component.ts` - Category list + CRUD
- `src/app/features/admin/categories/admin-category-dialog.component.ts` - Create/edit dialog
- `src/app/features/admin/categories/admin-categories.component.scss` - Category page styles
- `src/app/shared/utils/file-icons.ts` - File extension to Material Icon mapping

### Modified Files
- `supabase/schema.sql` - Added `categories` table, `category_id` FK on `files`, RLS, seed
- `src/app/core/models/file.model.ts` - Added `category_id` and `category` to FileRecord
- `src/app/core/services/file.service.ts` - Category joins, filters, upload param
- `src/app/app.routes.ts` - Added `/admin/categorias` route
- `src/app/app.component.html` - Added Categorias nav link for admins
- `src/app/features/admin/files/add-file-dialog.component.ts` - Category dropdown (MatSelect)
- `src/app/features/admin/files/admin-files.component.ts` - Category column in table
- `src/app/features/client/files/client-files.component.ts` - Full rewrite: sidebar + card grid
- `src/app/features/client/files/client-files.component.scss` - Full rewrite: glassmorphism cards

### CI/CD + GitHub Pages Deployment
1. **Workflow** - `.github/workflows/frontend.yml` builds and deploys frontend on push to `main` (PRs build only, no deploy)
2. **Lockfile sync** - Regenerated `package-lock.json` so `npm ci` finds `ts-node` + transitives
3. **Env materialization in CI** - Workflow writes `src/environments/{environment,environment.prod}.ts` from `SUPABASE_URL` / `SUPABASE_ANON_KEY` secrets; `INVITE_FUNCTION_URL` is derived
4. **Base-href** - Production build uses `--base-href=/frecafiles/` for the Pages subpath
5. **SPA fallback** - `index.html` copied to `404.html` so deep-link refreshes hit Angular router instead of GitHub's 404
6. **Pages source** - Repo Settings → Pages → Source set to "GitHub Actions"

### Password Recovery Flow
1. **Login screen** - "Olvide mi contrasena" link toggles to email-entry mode that calls `auth.resetPasswordForEmail(email, redirectTo)`
2. **redirectTo computation** - `${window.location.origin}${Location.prepareExternalUrl('/reset-password')}` — works in dev and under the `/frecafiles/` base-href without hardcoding
3. **Reset landing** - New `ResetPasswordComponent` parses the recovery token from URL hash (mirrors the invite-flow parser in `LoginComponent`), calls `setSession` or `exchangeCodeForSession`, prompts for new password, calls `auth.updatePassword`, navigates to home
4. **Auth service** - Added `resetPasswordForEmail(email, redirectTo)` wrapping `supabase.auth.resetPasswordForEmail`

### New Files
- `.github/workflows/frontend.yml` - Build + deploy workflow
- `src/app/features/auth/reset-password.component.ts` - Password recovery landing screen

### Modified Files
- `package-lock.json` - Synced with package.json (`npm ci` was failing in CI)
- `src/app/app.routes.ts` - Added `/reset-password` route
- `src/app/core/services/auth.service.ts` - Added `resetPasswordForEmail`
- `src/app/features/auth/login.component.ts` - Added forgot-password mode + email form
- `src/app/features/auth/login.component.scss` - `.forgot-link` styling for the secondary text button
