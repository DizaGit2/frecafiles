# FRECA Files

Portal de archivos para una firma de Transfer Pricing & Tax Consulting con autenticacion Supabase, administracion de clientes y almacenamiento privado con URLs firmadas.

## Requisitos
- Node.js LTS
- Angular CLI
- Proyecto Supabase (Auth, Postgres, Storage)

## Setup
1. Instala dependencias:
   ```bash
   npm install
   ```
2. Configura `src/environments/environment.ts` y `src/environments/environment.prod.ts` con tu proyecto Supabase.
3. Ejecuta el proyecto:
   ```bash
   npm start
   ```

## Variables de entorno (frontend)
Actualiza estos valores en `src/environments/environment.ts`:
- `supabaseUrl`
- `supabaseAnonKey`
- `inviteFunctionUrl`

## Supabase SQL
1. Ejecuta `supabase/schema.sql` en el SQL editor de Supabase para crear tablas y politicas.
2. Ejecuta `supabase/storage.sql` para crear el bucket privado y las politicas de Storage.

## Edge Function para invitaciones
La creacion de clientes usa un Edge Function para invitar por email y crear el perfil de base de datos.

1. Despliega la funcion:
   ```bash
   supabase functions deploy invite-client --no-verify-jwt
   ```
2. Configura variables en la funcion:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Estas se configuran en el dashboard de Supabase (Project Settings -> Functions -> Secrets) o con `supabase secrets set`.

> Nota: la Service Role Key **no** debe usarse en el frontend.

## Flujo de invitacion
1. El administrador abre **Agregar cliente**.
2. Se envia una invitacion por email y se crea un registro en `profiles`.
3. El cliente define su contrasena desde el email de invitacion y accede al portal.

## Soft delete de clientes
- La accion **Eliminar** solo marca `profiles.is_active = false`.
- No se eliminan usuarios de Auth ni archivos.
- Los clientes inactivos se excluyen de las consultas del portal.

## Signed URLs
- El bucket `freca-files` es privado.
- Para descargar/visualizar se generan URLs firmadas en tiempo real.

## Configuracion de tamano de archivo
- El limite de 25 MB se controla en `src/app/core/constants/app.constants.ts`.
- Ajusta `MAX_FILE_SIZE_MB` si deseas otro limite.

## Branding
- Coloca el logo oficial en `src/assets/logo.png`.
- Los colores y tipografia estan derivados del logo en `src/styles.scss`.

## Rutas principales
- Admin: `/admin/clientes` y `/admin/archivos`
- Cliente: `/client/archivos`

## UI testing (Playwright)
Se incluyen pruebas e2e basicas en `e2e/`.

1. Instala navegadores (una vez):
   ```bash
   npx playwright install
   ```
2. Define credenciales de pruebas:
   - `E2E_ADMIN_EMAIL`
   - `E2E_ADMIN_PASSWORD`
   - `E2E_CLIENT_EMAIL` (opcional)
   - `E2E_CLIENT_PASSWORD` (opcional)
3. Ejecuta:
   ```bash
   npm run e2e
   ```

## Estructura
- `src/app/core`: servicios, guards, modelos
- `src/app/shared`: componentes reutilizables
- `src/app/features`: pantallas por rol
