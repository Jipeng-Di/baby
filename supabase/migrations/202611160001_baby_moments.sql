-- Growth timeline: milestones, firsts, vaccine doses and checkups a family logs for a baby.
-- guide_key links an entry to an item in the built-in guide (lib/guide), e.g. 'm.2.social-smile' or
-- 'v.us.dtap.1', so the guide can show it as done. Free-form entries leave it null.
create table public.baby_moments (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null,
  family_id uuid not null,
  recorded_by uuid not null references auth.users(id),
  kind text not null check (kind in ('milestone','first','vaccine','checkup')),
  guide_key text check (guide_key is null or length(guide_key) between 1 and 80),
  title text not null check (length(btrim(title)) between 1 and 80),
  occurred_on date not null default current_date,
  note text check (note is null or length(note)<=500),
  photo_path text check (photo_path is null or length(photo_path)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (baby_id,family_id) references public.babies(id,family_id)
);

create index baby_moments_family_date_idx on public.baby_moments(family_id,occurred_on desc);
-- Each guide item can be logged once per baby.
create unique index baby_moments_baby_guide_key on public.baby_moments(baby_id,guide_key) where guide_key is not null;

create function public.touch_baby_moment() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger baby_moments_updated before update on public.baby_moments
for each row execute function public.touch_baby_moment();

create function public.validate_baby_moment() returns trigger
language plpgsql set search_path = '' as $$
declare
  born date;
begin
  select birthday into born from public.babies
    where id=new.baby_id and family_id=new.family_id and is_active;
  if born is null then raise exception 'Baby is not active in this family'; end if;
  -- One day of slack: the phone's local date can be ahead of the server's UTC date.
  if new.occurred_on > current_date + 1 then raise exception 'Date cannot be in the future'; end if;
  if new.occurred_on < born then raise exception 'Date cannot be before birth'; end if;
  if tg_op='UPDATE' then
    if new.recorded_by<>old.recorded_by then raise exception 'Cannot change recorder'; end if;
  elsif new.recorded_by<>(select auth.uid()) then
    raise exception 'Invalid recorder';
  end if;
  return new;
end;
$$;
create trigger baby_moments_validate before insert or update on public.baby_moments
for each row execute function public.validate_baby_moment();

alter table public.baby_moments enable row level security;
create policy baby_moments_read on public.baby_moments for select to authenticated using (public.is_family_member(family_id));
create policy baby_moments_insert on public.baby_moments for insert to authenticated with check (public.is_family_member(family_id) and recorded_by=(select auth.uid()));
create policy baby_moments_update on public.baby_moments for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy baby_moments_delete on public.baby_moments for delete to authenticated using (public.is_family_member(family_id));

revoke all on public.baby_moments from anon,authenticated;
grant select,insert,update,delete on public.baby_moments to authenticated;

-- Live sync to other family members' devices (Realtime applies the SELECT policy above).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='baby_moments'
  ) then
    alter publication supabase_realtime add table public.baby_moments;
  end if;
end $$;

-- Photos reuse the private 'baby-avatars' bucket under '<family_id>/moments/…', so the existing
-- family-folder storage policies already apply. No storage changes needed.
