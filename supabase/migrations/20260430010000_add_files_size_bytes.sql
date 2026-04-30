-- Add files.size_bytes so the client UI can show "2.4 MB" before the user
-- taps download. New uploads populate it from File.size at insert time;
-- existing rows are backfilled from storage.objects.metadata->>'size' which
-- supabase-js sets automatically on upload.

alter table public.files
  add column if not exists size_bytes bigint;

update public.files f
set size_bytes = ((so.metadata ->> 'size')::bigint)
from storage.objects so
where so.bucket_id = 'freca-files'
  and so.name = f.storage_path
  and f.size_bytes is null
  and so.metadata ? 'size';
