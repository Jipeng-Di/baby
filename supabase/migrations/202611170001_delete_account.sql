-- Account deletion (App Store guideline 5.1.1(v)): a signed-in user can remove their own account.
--
-- A family where the user is the only member is deleted outright (babies, feedings, growth, moments cascade).
-- Where other members remain, the user's records are handed to the remaining owner (or oldest member), the
-- user's membership is removed, and ownership of the family passes on if needed.
-- Photos in the storage bucket are removed by the app before calling this (storage policies allow it);
-- (superseded by 202611170002: the function no longer touches storage.objects).

-- The ownership guards on feedings/growth/moments refuse to change the recorder. Let this function through
-- by setting a transaction-local flag that the guards check.
create or replace function public.validate_feeding() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.fed_at > now() + interval '5 minutes' then raise exception 'Feeding time cannot be in the future'; end if;
 if not exists(select 1 from public.babies where id=new.baby_id and family_id=new.family_id and is_active) then
   raise exception 'Baby is not active in this family';
 end if;
 if tg_op='UPDATE' then
   if new.created_by<>old.created_by and current_setting('app.deleting_account', true) is distinct from '1' then
     raise exception 'Cannot change creator';
   end if;
 else
   if new.created_by<>(select auth.uid()) then raise exception 'Invalid creator'; end if;
 end if;
 return new;
end;
$$;

create or replace function public.validate_growth_measurement() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.measured_at > current_date then raise exception 'Measurement date cannot be in the future'; end if;
  if not exists(select 1 from public.babies where id=new.baby_id and family_id=new.family_id and is_active) then
    raise exception 'Baby is not active in this family';
  end if;
  if tg_op='UPDATE' then
    if new.recorded_by<>old.recorded_by and current_setting('app.deleting_account', true) is distinct from '1' then
      raise exception 'Cannot change recorder';
    end if;
  elsif new.recorded_by<>(select auth.uid()) then
    raise exception 'Invalid recorder';
  end if;
  return new;
end;
$$;

create or replace function public.validate_baby_moment() returns trigger
language plpgsql set search_path = '' as $$
declare born date;
begin
  select birthday into born from public.babies
    where id=new.baby_id and family_id=new.family_id and is_active;
  if born is null then raise exception 'Baby is not active in this family'; end if;
  if new.occurred_on > current_date + 1 then raise exception 'Date cannot be in the future'; end if;
  if new.occurred_on < born then raise exception 'Date cannot be before birth'; end if;
  if tg_op='UPDATE' then
    if new.recorded_by<>old.recorded_by and current_setting('app.deleting_account', true) is distinct from '1' then
      raise exception 'Cannot change recorder';
    end if;
  elsif new.recorded_by<>(select auth.uid()) then
    raise exception 'Invalid recorder';
  end if;
  return new;
end;
$$;

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
      delete from storage.objects where bucket_id = 'baby-avatars' and (storage.foldername(name))[1] = fam.id::text;
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
