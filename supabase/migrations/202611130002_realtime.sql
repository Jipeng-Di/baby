-- Broadcast row changes so every family member's device updates without a manual refresh.
-- Supabase Realtime evaluates the existing SELECT RLS policies for each subscriber,
-- so members only receive changes for their own family.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['feedings','babies','growth_measurements','family_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
