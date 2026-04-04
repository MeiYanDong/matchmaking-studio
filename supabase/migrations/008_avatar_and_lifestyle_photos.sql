alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists lifestyle_photo_urls text[];

update public.profiles
set lifestyle_photo_urls = photo_urls
where lifestyle_photo_urls is null
  and photo_urls is not null;
