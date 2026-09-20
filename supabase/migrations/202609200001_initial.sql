-- Run in Supabase SQL editor. All application access uses an authenticated JWT.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name)<=100),
  created_at timestamptz not null default now()
);
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique(family_id,user_id)
);
create table public.babies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  nickname text check (nickname is null or length(nickname)<=100),
  birthday date not null check (birthday between date '1900-01-01' and date '2100-01-01'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(id,family_id)
);
create table public.feedings (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null,
  family_id uuid not null,
  created_by uuid not null references auth.users(id),
  amount_ml integer not null check (amount_ml between 1 and 1000),
  feeding_type text not null check (feeding_type in ('formula','breast_milk','mixed')),
  fed_at timestamptz not null default now(),
  note text check (note is null or length(note)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (baby_id,family_id) references public.babies(id,family_id)
);
create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now()+interval '7 days'),
  created_at timestamptz not null default now()
);
create index family_members_user_idx on public.family_members(user_id,family_id);
create index babies_family_idx on public.babies(family_id,is_active);
create index feedings_family_date_idx on public.feedings(family_id,fed_at desc);
create index feedings_baby_date_idx on public.feedings(baby_id,fed_at desc);
create index family_invites_token_idx on public.family_invites(token);

-- SECURITY DEFINER avoids recursive family_members RLS lookup.
create function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.family_members where family_id=fid and user_id=(select auth.uid()));
$$;
revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;

create function public.touch_feeding() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger feedings_updated before update on public.feedings for each row execute function public.touch_feeding();

create function public.validate_feeding() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.fed_at > now()+interval '5 minutes' then raise exception 'Feeding time cannot be in the future'; end if;
 if not exists(select 1 from public.babies where id=new.baby_id and family_id=new.family_id and is_active) then
   raise exception 'Baby is not active in this family';
 end if;
 if tg_op='UPDATE' then
   if new.created_by<>old.created_by then raise exception 'Cannot change creator'; end if;
 else
   if new.created_by<>(select auth.uid()) then raise exception 'Invalid creator'; end if;
 end if;
 return new;
end;
$$;
create trigger feedings_validate before insert or update on public.feedings for each row execute function public.validate_feeding();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.babies enable row level security;
alter table public.feedings enable row level security;
alter table public.family_invites enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or exists(select 1 from public.family_members mine join public.family_members theirs on mine.family_id=theirs.family_id where mine.user_id=(select auth.uid()) and theirs.user_id=profiles.id));
create policy profiles_insert on public.profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy families_read on public.families for select to authenticated using (public.is_family_member(id));
create policy members_read on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy babies_read on public.babies for select to authenticated using (public.is_family_member(family_id));
create policy babies_insert on public.babies for insert to authenticated with check (public.is_family_member(family_id));
create policy babies_update on public.babies for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy feedings_read on public.feedings for select to authenticated using (public.is_family_member(family_id));
create policy feedings_insert on public.feedings for insert to authenticated with check (public.is_family_member(family_id) and created_by=(select auth.uid()));
create policy feedings_update on public.feedings for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy feedings_delete on public.feedings for delete to authenticated using (public.is_family_member(family_id));
create policy invites_read on public.family_invites for select to authenticated using (public.is_family_member(family_id));

-- Privilege grants are explicit. Family and membership writes only occur via RPCs.
revoke all on public.profiles,public.families,public.family_members,public.babies,public.feedings,public.family_invites from anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.families,public.family_members to authenticated;
grant select,insert,update on public.babies to authenticated;
grant select,insert,update,delete on public.feedings to authenticated;
grant select on public.family_invites to authenticated;

create function public.create_family(family_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(trim(family_name)) not between 1 and 100 then raise exception 'Invalid family name'; end if;
 insert into public.families(name,created_by) values(trim(family_name),auth.uid()) returning id into fid;
 insert into public.family_members(family_id,user_id,role) values(fid,auth.uid(),'owner');
 return fid;
end;
$$;
create function public.create_family_invite(fid uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare invite_token text;
begin
 if auth.uid() is null or not public.is_family_member(fid) then raise exception 'Not a family member'; end if;
 insert into public.family_invites(family_id,created_by) values(fid,auth.uid()) returning token into invite_token;
 return invite_token;
end;
$$;
create function public.join_family(invite_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select family_id into fid from public.family_invites where token=invite_token and expires_at>now();
 if fid is null then raise exception 'Invite is invalid or expired'; end if;
 insert into public.family_members(family_id,user_id,role) values(fid,auth.uid(),'member') on conflict(family_id,user_id) do nothing;
 return fid;
end;
$$;
revoke all on function public.create_family(text),public.create_family_invite(uuid),public.join_family(text) from public;
grant execute on function public.create_family(text),public.create_family_invite(uuid),public.join_family(text) to authenticated;

-- Keep family_id immutable on babies so a member cannot move a baby between families.
create function public.protect_baby_family() returns trigger language plpgsql set search_path = '' as $$
begin if new.family_id<>old.family_id then raise exception 'Cannot move baby to another family'; end if; return new; end;
$$;
create trigger babies_protect_family before update on public.babies for each row execute function public.protect_baby_family();
