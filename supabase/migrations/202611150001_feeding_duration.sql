-- Breastfeeding can be logged by duration (minutes) instead of volume.
alter table public.feedings
  add column if not exists duration_min smallint check (duration_min between 1 and 240);
