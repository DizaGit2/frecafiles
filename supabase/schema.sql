create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('administrator', 'client')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  storage_path text not null,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);

create table if not exists public.file_clients (
  file_id uuid references public.files(id) on delete cascade,
  client_user_id uuid references public.profiles(user_id),
  primary key (file_id, client_user_id)
);

create index if not exists idx_file_clients_client on public.file_clients(client_user_id);
create index if not exists idx_files_created_by on public.files(created_by);

create or replace function public.is_admin()
returns boolean
language sql
stable
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

-- Profiles policies
create policy "Admin can read active profiles"
  on public.profiles
  for select
  using (public.is_admin() and is_active = true);

create policy "Client can read own profile"
  on public.profiles
  for select
  using (user_id = auth.uid());

create policy "Admin can update profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (true);

-- Files policies
create policy "Admin full access to files"
  on public.files
  for all
  using (public.is_admin())
  with check (public.is_admin());

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
create policy "Admin full access to file clients"
  on public.file_clients
  for all
  using (public.is_admin())
  with check (public.is_admin());