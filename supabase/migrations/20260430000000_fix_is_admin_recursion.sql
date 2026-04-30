-- Fix: client queries to /rest/v1/files were 500ing with
-- "stack depth limit exceeded" (PostgREST/Postgres error 54001).
--
-- Root cause: is_admin() ran as the calling user with RLS enabled, so any
-- policy that called is_admin() (e.g. profiles' "Admin can read active
-- profiles") triggered another profiles SELECT which re-ran the same policy
-- and re-called is_admin() -> infinite recursion. Clients also had no SELECT
-- policy on file_clients, which broke the embedded `file_clients!inner`
-- join used by the client files screen and category counts.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'administrator'
      and is_active = true
  );
$$;

drop policy if exists "Clients can read own file clients" on public.file_clients;
create policy "Clients can read own file clients"
  on public.file_clients
  for select
  using (client_user_id = auth.uid());
