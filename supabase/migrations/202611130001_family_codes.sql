-- One account belongs to one family. Families use a permanent, unique code for joining.
alter table public.families add column family_code text;

update public.families
set family_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
where family_code is null;

alter table public.families
  alter column family_code set not null,
  alter column family_code set default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  add constraint families_family_code_format check (family_code ~ '^[A-Z0-9]{10}$'),
  add constraint families_family_code_key unique (family_code);

-- Fail safely instead of silently dropping access if legacy data contains accounts
-- that already belong to more than one family.
do $$
begin
  if exists (
    select 1 from public.family_members group by user_id having count(*)>1
  ) then
    raise exception 'Cannot enforce one family per account: legacy multi-family memberships exist';
  end if;
end $$;

create unique index family_members_one_family_per_user_idx
  on public.family_members(user_id);

create or replace function public.create_family(family_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if exists(select 1 from public.family_members where user_id=auth.uid()) then
    raise exception 'This account is already linked to a family';
  end if;
  if length(trim(family_name)) not between 1 and 100 then raise exception 'Invalid family name'; end if;
  insert into public.families(name,created_by) values(trim(family_name),auth.uid()) returning id into fid;
  insert into public.family_members(family_id,user_id,role) values(fid,auth.uid(),'owner');
  return fid;
end;
$$;

create function public.join_family_by_code(input_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  existing_fid uuid;
  normalized_code text := regexp_replace(upper(coalesce(input_code,'')),'[^A-Z0-9]','','g');
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;

  select family_id into existing_fid
  from public.family_members
  where user_id=auth.uid();

  select id into fid
  from public.families
  where family_code=normalized_code;

  if fid is null then raise exception 'Family code is invalid'; end if;
  if existing_fid is not null then
    if existing_fid<>fid then raise exception 'This account is already linked to a family'; end if;
    return fid;
  end if;

  insert into public.family_members(family_id,user_id,role)
  values(fid,auth.uid(),'member')
  on conflict(family_id,user_id) do nothing;
  return fid;
end;
$$;

-- Keep old invitation links working, while enforcing the same one-family rule.
create or replace function public.join_family(invite_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  existing_fid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select family_id into fid from public.family_invites where token=invite_token and expires_at>now();
  if fid is null then raise exception 'Invite is invalid or expired'; end if;
  select family_id into existing_fid from public.family_members where user_id=auth.uid();
  if existing_fid is not null then
    if existing_fid<>fid then raise exception 'This account is already linked to a family'; end if;
    return fid;
  end if;
  insert into public.family_members(family_id,user_id,role)
  values(fid,auth.uid(),'member')
  on conflict(family_id,user_id) do nothing;
  return fid;
end;
$$;

revoke all on function public.join_family_by_code(text) from public;
grant execute on function public.join_family_by_code(text) to authenticated;
