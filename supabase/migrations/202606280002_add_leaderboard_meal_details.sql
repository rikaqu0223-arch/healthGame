alter table public.leaderboard_scores
  add column if not exists veggie_count smallint not null default 0 check (veggie_count between 0 and 1000),
  add column if not exists junk_food_count smallint not null default 0 check (junk_food_count between 0 and 1000),
  add column if not exists meal_photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload leaderboard meal photos" on storage.objects;

create policy "Anyone can upload leaderboard meal photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'meal-photos');
