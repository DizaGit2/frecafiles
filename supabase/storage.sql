insert into storage.buckets (id, name, public)
values ('freca-files', 'freca-files', false)
on conflict (id) do nothing;

create policy "Admin manage bucket objects"
  on storage.objects
  for all
  using (bucket_id = 'freca-files' and public.is_admin())
  with check (bucket_id = 'freca-files' and public.is_admin());

create policy "Clients read assigned objects"
  on storage.objects
  for select
  using (
    bucket_id = 'freca-files'
    and exists (
      select 1
      from public.files f
      join public.file_clients fc on fc.file_id = f.id
      where f.storage_path = storage.objects.name
        and fc.client_user_id = auth.uid()
    )
  );
