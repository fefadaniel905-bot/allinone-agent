
-- ============================================================
-- FIX: Allinone Agent — businesses table for the WhatsApp route
-- Run this entirely in Supabase → SQL Editor → New Query → Run
-- Safe to run even if the table already exists in some form.
-- ============================================================

-- 1. Create the table if it doesn't exist yet at all
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- 2. Add every column the route needs, only if missing
--    (won't error or wipe data if they already exist)
alter table businesses add column if not exists business_id text;
alter table businesses add column if not exists name text;
alter table businesses add column if not exists business_info text;
alter table businesses add column if not exists owner_whatsapp text;

-- 3. Make business_id unique + not null so lookups are reliable
--    (skip the not-null step if you already have rows with NULL business_id —
--    fill those in first or this will error)
alter table businesses alter column business_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_business_id_key'
  ) then
    alter table businesses add constraint businesses_business_id_key unique (business_id);
  end if;
end $$;

-- 4. Index for fast lookup (what the route queries on every message)
create index if not exists idx_businesses_business_id on businesses (business_id);

-- 5. Remove any accidental whitespace in existing business_id values
--    (fixes silent 404s caused by trailing spaces from copy-paste)
update businesses set business_id = trim(business_id);

-- 6. Insert the working test row (or update it if it already exists
--    but with bad/missing data)
insert into businesses (business_id, name, business_info, owner_whatsapp)
values (
  'sarah-cakes',
  'Sarah''s Cakes',
  'We sell cakes and cupcakes in Rundu. Chocolate cake N$150, Vanilla cake N$130, Cupcakes N$15 each. Open Mon-Sat 8am-5pm. Location: Rundu town center, near the market.',
  '+264812345678'
)
on conflict (business_id)
do update set
  name = excluded.name,
  business_info = excluded.business_info,
  owner_whatsapp = excluded.owner_whatsapp;

-- 7. RLS stays on, no public policies — service_role key only
alter table businesses enable row level security;

-- 8. Verify — this should return exactly one row with business_id = 'sarah-cakes'
select business_id, length(business_id) as id_length, name, business_info
from businesses
where business_id = 'sarah-cakes';
