alter table public.babies
  add column avatar_path text check (avatar_path is null or length(avatar_path)<=500);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('baby-avatars','baby-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy baby_avatars_read on storage.objects for select to authenticated
using (bucket_id='baby-avatars' and public.is_family_member(((storage.foldername(name))[1])::uuid));

create policy baby_avatars_insert on storage.objects for insert to authenticated
with check (bucket_id='baby-avatars' and public.is_family_member(((storage.foldername(name))[1])::uuid));

create policy baby_avatars_update on storage.objects for update to authenticated
using (bucket_id='baby-avatars' and public.is_family_member(((storage.foldername(name))[1])::uuid))
with check (bucket_id='baby-avatars' and public.is_family_member(((storage.foldername(name))[1])::uuid));

create policy baby_avatars_delete on storage.objects for delete to authenticated
using (bucket_id='baby-avatars' and public.is_family_member(((storage.foldername(name))[1])::uuid));
