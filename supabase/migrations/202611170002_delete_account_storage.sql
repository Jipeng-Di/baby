-- Two fixes for account deletion found by the scenario tests:
-- 1. feedings / growth_measurements / baby_moments reference babies through a composite foreign key
--    without ON DELETE CASCADE, so deleting a family (which cascades to babies) failed with a
--    foreign-key violation as soon as the family had any records. Add the cascade.
-- 2. delete_account() deleted storage.objects rows directly. Supabase rejects that ("Direct
--    deletion from storage tables is not allowed"), which made every account deletion fail. The app
--    removes the family's photos through the Storage API before calling this function.
alter table public.feedings
  drop constraint if exists feedings_baby_id_family_id_fkey,
  add constraint feedings_baby_id_family_id_fkey
    foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade;
alter table public.growth_measurements
  drop constraint if exists growth_measurements_baby_id_family_id_fkey,
  add constraint growth_measurements_baby_id_family_id_fkey
    foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade;
alter table public.baby_moments
  drop constraint if exists baby_moments_baby_id_family_id_fkey,
  add constraint baby_moments_baby_id_family_id_fkey
    foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade;

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  fam record;
  heir uuid;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  perform set_config('app.deleting_account', '1', true);
  for fam in
    select f.id, f.created_by from public.families f
    join public.family_members m on m.family_id = f.id and m.user_id = uid
  loop
    select m.user_id into heir from public.family_members m
      where m.family_id = fam.id and m.user_id <> uid
      order by (m.role = 'owner') desc, m.created_at
      limit 1;
    if heir is null then
      delete from public.families where id = fam.id;
    else
      update public.feedings set created_by = heir where family_id = fam.id and created_by = uid;
      update public.growth_measurements set recorded_by = heir where family_id = fam.id and recorded_by = uid;
      update public.baby_moments set recorded_by = heir where family_id = fam.id and recorded_by = uid;
      update public.family_invites set created_by = heir where family_id = fam.id and created_by = uid;
      if fam.created_by = uid then
        update public.families set created_by = heir where id = fam.id;
        update public.family_members set role = 'owner' where family_id = fam.id and user_id = heir;
      end if;
      delete from public.family_members where family_id = fam.id and user_id = uid;
    end if;
  end loop;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
