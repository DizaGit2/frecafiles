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
- Client files UI (mobile-first card/list view): `src/app/features/client/files/client-files.component.ts`.
- File type icons utility: `src/app/shared/utils/file-icons.ts`.
- File size formatting pipe: `src/app/shared/pipes/file-size.pipe.ts`.
- Invite edge function: `supabase/functions/invite-client/index.ts`.

## Supabase Notes
- Schema + RLS in `supabase/schema.sql` and `supabase/storage.sql`. Migrations live in `supabase/migrations/`.
- `profiles` uses `is_active` for soft-delete; do not delete auth users or files.
- `categories` table: admin-managed, all authenticated users can read. Files have nullable `category_id` FK (`on delete set null`).
- `files.size_bytes` (bigint, nullable) populated at upload time and shown in the client UI; backfill migration reads from `storage.objects.metadata->>'size'`.
- Edge function requires CORS for localhost (already configured).

## E2E Tests (Playwright)
- Config: `playwright.config.ts` (uses port 4300).
- Functional specs:
  - `e2e/login.spec.ts`
  - `e2e/admin.spec.ts`
  - `e2e/client.spec.ts`
  - `e2e/invite.spec.ts`
  - `e2e/add-file-modal.spec.ts` (async client select)
  - `e2e/table-filters.spec.ts` (filters + tables + INNER join verification)
- Redesign-shell specs (added in editorial-luxury redesign):
  - `e2e/redesign-shell.spec.ts` — login eyebrow + Cinzel title; admin pages have a single `.freca-page__header` with one bottom border; inline `.freca-card` has `backdrop-filter: none`; dialog `.mdc-dialog__surface` keeps glass.
  - `e2e/redesign-icons.spec.ts` — file-card icon colors must resolve to one of four palette tones; admin preview/download hover background must be gold (no Material blue/green).
  - `e2e/redesign-empty-states.spec.ts` — admin categories with no matches shows a Cinzel `—` drop-cap + italic copy.
  - `e2e/redesign-dialogs.spec.ts` — submit `.btn-spinner` is visible while `loading` is true (gates `/rest/v1/categories` to keep the request open).
- Run all: `npx -y dotenv-cli -e .env.local -- npx playwright test`. Default-loaded `.env` has placeholders only; without `dotenv-cli`, env-driven specs skip.
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

## UI Design - Editorial Luxury Theme

The brand promise is heritage, exclusivity, and prestige — FRECA is a financial consultancy serving large corporations. The design committed to an "Editorial Luxury" direction (Brunello Cucinelli / J.P. Morgan Private Bank / FT Weekend feel): restraint, gold-as-punctuation, exquisite typography, hairline gold rules instead of glass borders for separation, asymmetric editorial layouts on key screens, slow refined motion. Glass is dialed back: kept only on floating overlays (dialogs, menus, autocomplete, select, snackbar), removed from inline cards in favor of flat charcoal paper surfaces with hairline borders.

### Design Tokens (CSS Custom Properties)
Located in `src/styles.scss`:
- **Brand colors**: `--freca-gold` (#f2b544), `--freca-gold-light`, `--freca-gold-dark`, `--freca-gold-soft` (#e8c87a — body emphasis, drop-caps, hover tints), `--freca-cream`, `--freca-white`, `--freca-charcoal`, `--freca-graphite`, `--freca-mist`, `--freca-ash` (#c9c0b5 — decorative dividers, disabled labels), `--freca-ash-strong` (#d8d0c5 — hints, metadata, supporting text — passes AA on small text), `--freca-danger` (#d97a6c — warm terracotta replaces bright red).
- **Editorial rules**: `--freca-rule` (gold hairline at 18% opacity, used between sections), `--freca-rule-soft` (neutral hairline at 6% opacity, used for table row separators).
- **Surfaces (flat paper)**: `--surface-paper` (#121212 — default card), `--surface-paper-raised` (#181818 — sidebar, filter card), `--surface-paper-sunken` (#0d0d0d — table header, card thumbnails, empty states).
- **Glass effects** (overlays only): `--glass-bg`, `--glass-bg-light`, `--glass-bg-dark`, `--glass-border`, `--glass-blur`, `--glass-blur-strong`.
- **Surfaces (translucent)**: `--surface-0` through `--surface-elevated` (still used in some legacy contexts).
- **Shadows**: `--shadow-sm` through `--shadow-xl`, `--shadow-glow`.
- **Transitions**: `--transition-fast`, `--transition-normal`, `--transition-slow`.
- **Border radius**: `--radius-sm` through `--radius-full`.
- **Spacing**: `--space-xs` through `--space-2xl`.
- **Typography scale**: `--font-size-xs` (12px) through `--font-size-3xl` (44px); `--line-height-tight/snug/normal/relaxed`; `--tracking-tight/normal/wide/wider`.

### Key UI Classes
- **Page shell**:
  - `.freca-page` - Vertical flex container with `gap: var(--space-xl)` (32px canonical rhythm), `max-width: 1280px`, exposes `--freca-sticky-top` for nested sticky elements.
  - `.freca-page__header` - Header row (eyebrow + title left, action button right), 1px gold hairline below.
  - `.freca-page__heading` - Wraps eyebrow/title/subtitle vertically.
  - `.freca-page__eyebrow` - Cinzel uppercase gold, sits above the title.
  - `.freca-page__title` - Cinzel display title (`--font-size-2xl`).
  - `.freca-page__subtitle` - Italic Newsreader, `--freca-ash-strong`.
- **Card surfaces**:
  - `.freca-card` - Flat paper card (`var(--surface-paper)` + 1px `--freca-rule-soft` border). NO glass blur. Hover bumps border to `--freca-rule`.
  - `.freca-card--elevated` - Slight raise (`--surface-paper-raised` + `--shadow-md`).
- **Editorial typography**:
  - `.freca-section-title` - Cinzel uppercase, `--font-size-xl`, gold-tinted.
  - `.freca-muted` - `--freca-ash-strong` at `--font-size-sm`.
- **Layout helpers**:
  - `.freca-form-grid` - CSS Grid for form fields (no background — the wrapping `.filter-card` provides the surface).
  - `.freca-form-actions` - Flex container for form buttons (right-aligned).
  - `.freca-actions` - Flex container for table action buttons; primary buttons get gold, warn buttons get `--freca-danger` with terracotta hover.
- **Editorial details**:
  - `.empty-state` / `.empty-state__mark` / `.empty-state__copy` - Centered drop-cap (Cinzel em-dash) + italic Newsreader copy. Used by `paginated-table` (default fallback) and overridable via `[emptyState]` content projection.
  - `.btn-spinner` - 14px CSS-only ring spinner using `currentColor` borders. Renders inside submit buttons during async actions (alongside a "Guardando..." label).
- **Login editorial column** (`login-editorial__*`): eyebrow, display title, lede, italic pull-quote with gold left-bar, hairline rule, and Cinzel meta line.

### Material Design Theming
- Uses MDC design tokens for consistent theming.
- Glass survives on overlays: `mat-mdc-dialog-container`, `mat-mdc-snack-bar-container`, `mat-mdc-autocomplete-panel`, `mat-mdc-select-panel`, `mat-mdc-menu-panel`. Inline `.freca-card` is opaque charcoal paper.
- Error colors: warm terracotta `--freca-danger` (#d97a6c) — replaced the previous bright `#ff8a80` and the four duplicate `--mdc-...-error-label-text-color` declarations were consolidated to a single block.
- Form-field hint/supporting text uses `--freca-ash-strong` (was `--freca-ash`, which failed AA on small text).
- Toolbar uses a single 1px `--freca-rule` border-bottom (no double gold gradient + box-shadow stack).

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

### 6. Page Shell — Editorial Rhythm
Every primary page (admin & client) wraps content in `.freca-page`. Sections inside are separated by the canonical `var(--space-xl)` (32px) gap from `.freca-page`. Components do NOT add their own `margin-bottom` for inter-section spacing — it comes from the page shell. The header pattern:
```html
<section class="freca-page">
  <header class="freca-page__header">
    <div class="freca-page__heading">
      <p class="freca-page__eyebrow">Administracion</p>
      <h2 class="freca-page__title">Consultar X</h2>
      <p class="freca-page__subtitle">...optional...</p>
    </div>
    <button mat-flat-button color="primary">Agregar X</button>
  </header>

  <section class="freca-card filter-card">
    <form>...</form>
  </section>

  <app-paginated-table>...</app-paginated-table>
</section>
```
Existing E2E specs assert `getByRole('heading', { name: 'Consultar X' })` and `'FRECA Files'` and `'Mis archivos'` — keep those exact heading texts when restyling.

### 7. Inline Submit Spinner
Async submit buttons render a CSS-only ring spinner alongside a "Guardando..." label. Pattern (use a plain `<span>`, not `<mat-progress-spinner>` — the directive does not bind reliably inside `mat-flat-button` content):
```html
<button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || loading">
  <span class="btn-content">
    <span *ngIf="loading" class="btn-spinner" aria-hidden="true"></span>
    <span>{{ loading ? 'Guardando...' : 'Guardar' }}</span>
  </span>
</button>
```
The `.btn-spinner` and its `btn-spinner-rotate` keyframe are global in `src/styles.scss`. Component-level `.btn-content` styles inline-flex with an 8px gap.

### 8. Editorial Empty State
The shared paginated-table component shows a default empty state when `total === 0 && !loading`. Pages can project their own copy via `[emptyState]` content children:
```html
<app-paginated-table ...>
  <ng-container matColumnDef="...">...</ng-container>

  <ng-container emptyState>
    <span aria-hidden="true" class="empty-state__mark">&mdash;</span>
    <p class="empty-state__copy">Aun no hay categorias.</p>
  </ng-container>
</app-paginated-table>
```
Default fallback shows the same Cinzel `&mdash;` + italic "Sin resultados.".

### 9. Editorial Asymmetric Login
The login screen uses a CSS-grid asymmetric split (`minmax(0, 1.1fr) 1px minmax(0, 0.9fr)`) with a vertical hairline gold gradient between the editorial column (eyebrow + display title + italic pull-quote) and the form column. Below 900px it collapses to a single column and the rule disappears. Reset-password reuses the same SCSS file for visual continuity.

### 10. Mobile Breakpoints (Client Files)
Three-tier responsive scheme used by the client files screen:
- `<= 900px` (tablet) — sidebar collapses; category list flips to a horizontal chip strip with `scroll-snap-type: x proximity`, edge `mask-image` fade, and `scrollIntoView({ inline: 'center' })` on selection.
- `<= 720px` (phone) — sidebar header hidden, page heading hidden, `.search-bar` becomes `position: sticky; top: 0;` against `var(--freca-charcoal)`. Toolbar trims to crest + circular initial avatar (named user button hidden, "FRECA Files" wordmark hidden, role badge hidden, redundant single-route nav hidden).
- `<= 600px` (small phone) — file grid flips from card layout to list rows: `flex-direction: row` on `.file-card`, 56px thumbnail on the left, body in the middle, action icons on the right.

### 11. Grid `min-width: 0` for Horizontal Carousels
A grid track (`1fr` or `auto`) defaults to `min-width: auto`, which means flex children with `flex: 0 0 auto` (e.g. a chip carousel) expand the track to their intrinsic width and trigger page-level horizontal scroll even with `overflow-x: auto` on the inner element. Fix at the **grid track + grid item** level:
```scss
.layout {
  grid-template-columns: minmax(0, 1fr); // not 1fr
}
.layout > .sidebar {
  min-width: 0;
  overflow: hidden; // belt & braces
}
```
Used at `<= 900px` in `client-files.component.scss` so the category chip strip's own `overflow-x: auto` is what actually scrolls.

### 12. Supabase Signed URL Download Disposition
For real downloads on mobile (especially iOS Safari, where `window.open` on a Supabase URL inline-renders Office docs as "can't display this file"), use the `download` option:
```typescript
supabase.storage.from(BUCKET).createSignedUrl(path, expirySeconds, { download: filename });
```
The URL gains `?download=<name>` and the response carries `Content-Disposition: attachment; filename="<name>"`. Then trigger via a programmatic anchor click (NOT `window.open`), which preserves the user-gesture chain on iOS:
```typescript
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.rel = 'noopener';
document.body.appendChild(a);
a.click();
a.remove();
```
`FileService.createSignedDownloadUrl(path, name)` wraps this. Use `createSignedUrl` (no `download` option) for previews — that returns an inline-rendering URL.

### 13. Fullscreen Dialog on Phones
For the file preview, sniff `window.matchMedia('(max-width: 600px)').matches` at open time and pass:
```typescript
{
  width: '100vw', maxWidth: '100vw',
  height: '100dvh', maxHeight: '100dvh',
  panelClass: 'fullscreen-dialog'
}
```
The `.fullscreen-dialog` global rule in `styles.scss` overrides `.mdc-dialog__surface` to `border-radius: 0` and clamps max-width/max-height. Use `100dvh` (not `100vh`) so iOS Safari's collapsing address bar doesn't clip the bottom.

### 14. Live-Search Pattern (Debounced FormControl)
Replace `<form (ngSubmit)>` patterns with a debounced `valueChanges` subscription so typing on a soft keyboard filters live. Pattern:
```typescript
this.searchSub = this.searchControl.valueChanges
  .pipe(debounceTime(300), distinctUntilChanged())
  .subscribe(() => this.loadFiles());
```
Always pair with a clear (×) suffix button (`<button matSuffix mat-icon-button>` with `*ngIf="searchControl.value"`) and `OnDestroy` cleanup. See `client-files.component.ts`.

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

### Editorial Luxury Redesign
Aesthetic pivot from glassmorphism to editorial luxury. The premise: FRECA serves big corporate clients in financial consulting; the UI should communicate heritage and exclusivity, not look like a generic SaaS dashboard.

**Design system changes**:
1. **Token reform** — typography scale (`--font-size-xs`..`--font-size-3xl`, `--line-height-*`, `--tracking-*`), color tokens (`--freca-gold-soft`, `--freca-rule`, `--freca-rule-soft`, `--freca-danger`, `--freca-ash-strong`, `--surface-paper*`); removed unused `--freca-amber*` and legacy `--freca-card`/`--freca-shadow` aliases; consolidated four duplicate `--mdc-...-error-label-text-color` declarations.
2. **Glass dialed back** — `.freca-card` is now flat `--surface-paper` with `--freca-rule-soft` border, no backdrop blur. Glass survives only on dialogs, menus, autocomplete, select panels, snackbars.
3. **Page shell** — new `.freca-page` family with canonical 32px rhythm; resolves the prior 40px stacked-header issue (headers had `margin-bottom: 24px` + `padding-bottom: 16px` + a border).
4. **Toolbar** — removed redundant gold `box-shadow` + `::after` underline gradient; single 1px hairline border-bottom.
5. **Body background** — replaced four overlapping gradients with subtle corner vignettes + paper-grain SVG noise.
6. **Animations** — removed `pulse-glow` keyframes; added staggered slideUp on `.freca-page > *`; new `btn-spinner-rotate` for inline submit spinners.

**Component-level changes**:
1. **Auth (login + reset-password)** — asymmetric two-column editorial layout; eyebrow "Private Portal" / "Recuperacion", Cinzel display title at `--font-size-3xl`, italic Newsreader pull-quote with gold left-bar. Vertical hairline gold rule between columns. Forgot-password link moved into a hairline-bordered footer with proper breathing room (was 8px below submit, now 16px + rule). Removed `MatCardModule` import.
2. **Admin (clients/files/categories)** — all wrapped in `.freca-page` with the canonical header. Filter forms in flat `.freca-card.filter-card`. Action icon buttons use gold for primary, `--freca-danger` for warn (preview/download hover backgrounds switched from Material blue/green to gold).
3. **Client files** — flat-paper sidebar with vertical hairline rule, gold left-bar on active category, file cards with editorial Cinzel labels (no colored badge backgrounds — file-type is conveyed by icon color + a small Cinzel label).
4. **Dialogs (add-file, admin-category, admin-client)** — submit buttons render an inline `.btn-spinner` while saving. Used a CSS-only ring spinner because `<mat-progress-spinner>` did not bind reliably inside `mat-flat-button` content at runtime.
5. **Paginated table** — Cinzel header on `--surface-paper-sunken`, `var(--font-size-sm)` cells, `--freca-rule-soft` row separators; new `[emptyState]` content projection slot with default Cinzel-em-dash fallback.
6. **File-type icons (`src/app/shared/utils/file-icons.ts`)** — recolored 23 entries from raw Material colors (red/blue/green/purple/orange) to four palette tones via CSS vars: `--freca-gold` (PDF/DOC/CSV), `--freca-gold-soft` (XLS/PPT), `--freca-cream` (images), `--freca-ash-strong` (binary/media). Default file: `--freca-ash-strong`.

**E2E coverage**: 4 new specs added (`redesign-shell`, `redesign-icons`, `redesign-empty-states`, `redesign-dialogs`). Existing 6 functional specs still pass.

### New / Modified Files
- `src/styles.scss` - Token system, page shell, flat-card, btn-spinner, empty-state, body background
- `src/app/shared/utils/file-icons.ts` - Recolored to brand palette
- `src/app/shared/components/paginated-table/paginated-table.component.ts` + `.scss` - Editorial header, `[emptyState]` projection, hairline separators
- `src/app/features/auth/login.component.ts` + `.scss` - Asymmetric editorial split (full SCSS rewrite)
- `src/app/features/auth/reset-password.component.ts` - Shares the new login SCSS
- `src/app/features/admin/clients/admin-clients.component.ts` + `.scss` - `.freca-page` shell, gold/danger action buttons
- `src/app/features/admin/clients/admin-client-dialog.component.ts` - Inline `.btn-spinner`
- `src/app/features/admin/files/admin-files.component.ts` + `.scss` - Shell + `.preview-btn`/`.download-btn` classes, gold hovers
- `src/app/features/admin/files/add-file-dialog.component.ts` - Inline `.btn-spinner`
- `src/app/features/admin/categories/admin-categories.component.ts` + `.scss` - Shell + projected empty state
- `src/app/features/admin/categories/admin-category-dialog.component.ts` - Inline `.btn-spinner`
- `src/app/features/client/files/client-files.component.ts` + `.scss` - Editorial sidebar, flat-paper cards (full SCSS rewrite)
- `e2e/redesign-shell.spec.ts`, `e2e/redesign-icons.spec.ts`, `e2e/redesign-empty-states.spec.ts`, `e2e/redesign-dialogs.spec.ts` - New redesign specs

### Mobile UX Overhaul (Client Files)
Most clients access `/client/archivos` from a phone. The audit found four fronts where the desktop-first design degraded badly on mobile: cards too tall (~3 visible per screen), search required Enter-to-submit, category strip caused page-level horizontal scroll, and the toolbar consumed ~40% of the viewport. Patches landed across three passes.

**First pass** — density, reachability, toolbar:
1. **List view at `<= 600px`** — `.file-card` flips from a 240px-wide card to a 64px-tall horizontal row (icon + body + actions). Roughly 2× density vs. the prior 2-up grid.
2. **Sticky search at `<= 720px`** — page heading hidden; `.search-bar` sticks to the viewport top with an opaque charcoal background. Inline italic count rendered below the field as `.search-bar__count`.
3. **Debounced live search** — replaced `<form (ngSubmit)>` with a `searchControl.valueChanges.pipe(debounceTime(300))` subscription; added a clear (×) suffix button.
4. **Category carousel** — `scroll-snap-type: x proximity`, `mask-image` edge fade, ≥44px tap targets, and `scrollIntoView({ inline: 'center' })` after `selectCategory()`.
5. **Toolbar trim at `<= 720px`** — hide "FRECA Files" wordmark (keep crest), hide "Cliente" badge, hide redundant single-route nav for clients, replace named menu trigger with circular gold-bordered initial avatar (new `getInitial()` helper on `AppComponent`).
6. **Hide preview button when `!file.previewable`** — disabled icon-buttons with hidden tooltips were silent dead-zones on touch.

**Layout fix (carousel overflow)** — chip strip with `flex: 0 0 auto` items was expanding the grid track via grid's default `min-width: auto`, triggering page-level horizontal scroll. Fixed by switching `.files-layout` to `grid-template-columns: minmax(0, 1fr)` and adding `min-width: 0; overflow: hidden;` to `.files-sidebar` at the `<= 900px` breakpoint.

**Second pass** — preview/download semantics:
1. **Fullscreen preview on phones** — `previewFile()` sniffs `(max-width: 600px)` and opens the dialog with `100vw` × `100dvh` and `panelClass: 'fullscreen-dialog'`. New global `.fullscreen-dialog` rule in `styles.scss` overrides surface radius and max dimensions.
2. **Real download semantics** — `FileService.createSignedDownloadUrl(path, name)` calls Supabase with `{ download: name }` so the response carries `Content-Disposition: attachment`. `client-files.downloadFile()` triggers via a programmatic `<a download>` click (replaces `window.open`), preserving the user-gesture chain on iOS Safari and the original filename in the Save As dialog.

**File size** — `files.size_bytes` (bigint, nullable) added with backfill migration `20260430010000_add_files_size_bytes.sql` reading from `storage.objects.metadata->>'size'`. Captured at upload time in `FileService.uploadFile`. New `FileSizePipe` formats `2 KB / 2.4 MB / 1.2 GB` (1 decimal under 10, 0 above). Rendered in a `.card-stats` row alongside the date with a CSS-only `·` separator (`span + span::before { content: '·' }`).

### New / Modified Files
- `src/app/shared/pipes/file-size.pipe.ts` - New: `FileSizePipe` (standalone, name `fileSize`)
- `supabase/migrations/20260430010000_add_files_size_bytes.sql` - New: adds `files.size_bytes` + storage backfill
- `supabase/schema.sql` - Added `size_bytes bigint` to `files` table + idempotent ALTER
- `src/app/core/models/file.model.ts` - Added `size_bytes?: number | null`
- `src/app/core/services/file.service.ts` - Captures `size_bytes` on upload; new `createSignedDownloadUrl(path, name)` using `{ download }` option
- `src/app/features/client/files/client-files.component.ts` + `.scss` - Mobile-first list view, sticky search, debounced filter, category carousel, fullscreen preview, anchor download, size pipe
- `src/app/app.component.html` + `.scss` + `.ts` - Toolbar trim at `<= 720px`, circular initial avatar, `getInitial()` helper
- `src/styles.scss` - `.fullscreen-dialog` global override
