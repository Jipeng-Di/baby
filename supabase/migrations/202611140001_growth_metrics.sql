-- Length and head circumference alongside weight. Each visit may record any subset of the three.
alter table public.growth_measurements
  alter column weight_kg drop not null,
  add column length_cm numeric(4,1) check (length_cm is null or length_cm between 20 and 130),
  add column head_cm numeric(4,1) check (head_cm is null or head_cm between 18 and 60),
  add constraint growth_measurements_has_value
    check (weight_kg is not null or length_cm is not null or head_cm is not null);

-- Gestational age at birth in days (e.g. 34 weeks + 2 days = 240). Used for corrected age when < 37 weeks.
alter table public.babies
  add column gestational_age_days smallint
    check (gestational_age_days is null or gestational_age_days between 154 and 315);
