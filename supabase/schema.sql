create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('administrator', 'client')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_categories_display_order on public.categories(display_order, name);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  storage_path text not null,
  size_bytes bigint,
  created_by uuid references public.profiles(user_id),
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz default now()
);

-- Add category_id to existing files table (no-op on fresh databases)
alter table public.files
  add column if not exists category_id uuid references public.categories(id) on delete set null;

-- Add size_bytes to existing files table (no-op on fresh databases)
alter table public.files
  add column if not exists size_bytes bigint;

create table if not exists public.file_clients (
  file_id uuid references public.files(id) on delete cascade,
  client_user_id uuid references public.profiles(user_id),
  primary key (file_id, client_user_id)
);

create index if not exists idx_file_clients_client on public.file_clients(client_user_id);
create index if not exists idx_files_created_by on public.files(created_by);
create index if not exists idx_files_category_id on public.files(category_id);

-- SECURITY DEFINER bypasses RLS on the inner profiles read so that policies
-- referencing is_admin() (e.g. on profiles itself) cannot recurse through it
-- and blow the stack. Must run with a fixed search_path for safety.
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

alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.file_clients enable row level security;
alter table public.categories enable row level security;

-- Profiles policies
drop policy if exists "Admin can read active profiles" on public.profiles;
create policy "Admin can read active profiles"
  on public.profiles
  for select
  using (public.is_admin() and is_active = true);

drop policy if exists "Client can read own profile" on public.profiles;
create policy "Client can read own profile"
  on public.profiles
  for select
  using (user_id = auth.uid());

drop policy if exists "Admin can update profiles" on public.profiles;
create policy "Admin can update profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (true);

-- Files policies
drop policy if exists "Admin full access to files" on public.files;
create policy "Admin full access to files"
  on public.files
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Clients can read assigned files" on public.files;
create policy "Clients can read assigned files"
  on public.files
  for select
  using (
    exists (
      select 1
      from public.file_clients fc
      where fc.file_id = public.files.id
        and fc.client_user_id = auth.uid()
    )
  );

-- File_clients policies
drop policy if exists "Admin full access to file clients" on public.file_clients;
create policy "Admin full access to file clients"
  on public.file_clients
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Clients can read own file clients" on public.file_clients;
create policy "Clients can read own file clients"
  on public.file_clients
  for select
  using (client_user_id = auth.uid());

-- Categories policies
drop policy if exists "Admin full access to categories" on public.categories;
create policy "Admin full access to categories"
  on public.categories
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated users can read categories" on public.categories;
create policy "Authenticated users can read categories"
  on public.categories
  for select
  using (auth.uid() is not null);

-- Seed default category and backfill existing files
insert into public.categories (name, display_order)
values ('General', 0)
on conflict (name) do nothing;

update public.files
set category_id = (select id from public.categories where name = 'General')
where category_id is null;