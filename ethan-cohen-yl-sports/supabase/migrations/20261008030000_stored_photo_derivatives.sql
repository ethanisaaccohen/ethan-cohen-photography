-- Additive, safe on the live project where these columns already exist.
alter table public.photos
  add column if not exists thumbnail_url text,
  add column if not exists viewing_url text,
  add column if not exists thumbnail_storage_key text,
  add column if not exists viewing_storage_key text;

-- Bucket creation is performed through the Storage API, not object-table writes.
-- Public reads match the previous public B2 image behavior.
-- Uploads remain server-only using the service-role client behind admin auth.
