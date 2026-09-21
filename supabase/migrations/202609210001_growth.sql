alter table public.babies
  add column sex text check (sex in ('female','male'));

create table public.growth_measurements (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null,
  family_id uuid not null,
  recorded_by uuid not null references auth.users(id),
  weight_kg numeric(5,2) not null check (weight_kg between 0.5 and 80),
  measured_at date not null default current_date,
  note text check (note is null or length(note)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (baby_id,family_id) references public.babies(id,family_id)
);

create index growth_measurements_family_date_idx on public.growth_measurements(family_id,measured_at desc);
create index growth_measurements_baby_date_idx on public.growth_measurements(baby_id,measured_at desc);

create function public.touch_growth_measurement() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger growth_measurements_updated before update on public.growth_measurements
for each row execute function public.touch_growth_measurement();

create function public.validate_growth_measurement() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.measured_at > current_date then raise exception 'Measurement date cannot be in the future'; end if;
  if not exists(select 1 from public.babies where id=new.baby_id and family_id=new.family_id and is_active) then
    raise exception 'Baby is not active in this family';
  end if;
  if tg_op='UPDATE' then
    if new.recorded_by<>old.recorded_by then raise exception 'Cannot change recorder'; end if;
  elsif new.recorded_by<>(select auth.uid()) then
    raise exception 'Invalid recorder';
  end if;
  return new;
end;
$$;
create trigger growth_measurements_validate before insert or update on public.growth_measurements
for each row execute function public.validate_growth_measurement();

alter table public.growth_measurements enable row level security;
create policy growth_measurements_read on public.growth_measurements for select to authenticated using (public.is_family_member(family_id));
create policy growth_measurements_insert on public.growth_measurements for insert to authenticated with check (public.is_family_member(family_id) and recorded_by=(select auth.uid()));
create policy growth_measurements_update on public.growth_measurements for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy growth_measurements_delete on public.growth_measurements for delete to authenticated using (public.is_family_member(family_id));

revoke all on public.growth_measurements from anon,authenticated;
grant select,insert,update,delete on public.growth_measurements to authenticated;
