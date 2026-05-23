
insert into storage.buckets (id, name, public)
values ('signage', 'signage', true)
on conflict (id) do nothing;

create policy "signage public read"
on storage.objects for select
to public
using (bucket_id = 'signage');

create policy "signage owner write"
on storage.objects for insert
to authenticated
with check (bucket_id = 'signage' and public.has_role(auth.uid(), 'owner'::app_role));

create policy "signage owner update"
on storage.objects for update
to authenticated
using (bucket_id = 'signage' and public.has_role(auth.uid(), 'owner'::app_role));

create policy "signage owner delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'signage' and public.has_role(auth.uid(), 'owner'::app_role));
