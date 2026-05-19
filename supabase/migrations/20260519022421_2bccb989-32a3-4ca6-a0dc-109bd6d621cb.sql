insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "avatars public read"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars auth insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars');

create policy "avatars auth update"
on storage.objects for update to authenticated
using (bucket_id = 'avatars');

create policy "avatars auth delete"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars');