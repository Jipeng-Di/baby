-- Everyday care log next to feedings: sleep, diapers, tummy time, baths, medicine and temperature.
--
-- started_at is when it happened (or began). ended_at is set for things with a duration: a sleep or a
-- tummy-time session. A sleep with ended_at null is still going on, and the app shows it as a running
-- timer; each baby has at most one of those at a time.
create table public.baby_events (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null,
  family_id uuid not null,
  created_by uuid not null references auth.users(id),
  kind text not null check (kind in ('sleep','diaper','tummy','bath','medicine','temperature')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Diapers only: wet, dirty or both.
  diaper text check (diaper is null or diaper in ('wet','dirty','both')),
  -- Temperature only, always stored in °C.
  temperature_c numeric(3,1) check (temperature_c is null or temperature_c between 34 and 43),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade,
  check (ended_at is null or (ended_at >= started_at and ended_at <= started_at + interval '24 hours')),
  check (ended_at is null or kind in ('sleep','tummy')),
  check ((kind = 'diaper') = (diaper is not null)),
  check ((kind = 'temperature') = (temperature_c is not null))
);

create index baby_events_family_time_idx on public.baby_events(family_id, started_at desc);
create unique index baby_events_one_open_sleep on public.baby_events(baby_id)
  where kind = 'sleep' and ended_at is null;

create function public.touch_baby_event() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger baby_events_updated before update on public.baby_events
for each row execute function public.touch_baby_event();

create function public.validate_baby_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.babies where id = new.baby_id and family_id = new.family_id and is_active) then
    raise exception 'Baby is not active in this family';
  end if;
  if new.started_at > now() + interval '5 minutes' or new.ended_at > now() + interval '5 minutes' then
    raise exception 'Time cannot be in the future';
  end if;
  if tg_op = 'UPDATE' then
    if new.created_by <> old.created_by and current_setting('app.deleting_account', true) is distinct from '1' then
      raise exception 'Cannot change creator';
    end if;
  elsif new.created_by <> (select auth.uid()) then
    raise exception 'Invalid creator';
  end if;
  return new;
end;
$$;
create trigger baby_events_validate before insert or update on public.baby_events
for each row execute function public.validate_baby_event();

alter table public.baby_events enable row level security;
create policy baby_events_read on public.baby_events for select to authenticated
  using (public.is_family_member(family_id));
create policy baby_events_insert on public.baby_events for insert to authenticated
  with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy baby_events_update on public.baby_events for update to authenticated
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy baby_events_delete on public.baby_events for delete to authenticated
  using (public.is_family_member(family_id));

revoke all on public.baby_events from anon, authenticated;
grant select, insert, update, delete on public.baby_events to authenticated;

-- Live sync to other family members' devices (Realtime applies the SELECT policy above).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'baby_events'
  ) then
    alter publication supabase_realtime add table public.baby_events;
  end if;
end $$;

-- Account deletion also hands this user's care records to the remaining family member.
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
      update public.baby_events set created_by = heir where family_id = fam.id and created_by = uid;
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
