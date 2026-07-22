-- Allinone Trust — Multi-Tenant WhatsApp Agent
-- Run this in Supabase: Project → SQL Editor → New Query → Run

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  business_id text unique not null,       -- short slug, e.g. 'sarah-cakes'
  name text not null,                      -- display name, e.g. 'Sarah's Cakes'
  business_info text not null,             -- free-text: hours, prices, menu, location, etc.
  owner_whatsapp text not null,            -- e.g. '+264812345678'
  created_at timestamptz default now()
);

-- Speeds up the lookup route.ts does on every incoming message
create index if not exists idx_businesses_business_id on businesses (business_id);

-- Row Level Security: ON by default in Supabase. Since this table is only
-- ever read by your server (using the service_role key, which bypasses RLS),
-- you do NOT need to add public policies. Leave RLS enabled and add no
-- policies — that keeps the table completely inaccessible from the browser
-- or any client using the anon key.
alter table businesses enable row level security;

-- Example row (delete or edit before going live)
insert into businesses (business_id, name, business_info, owner_whatsapp)
values (
  'sarah-cakes',
  'Sarah''s Cakes',
  'We sell cakes and cupcakes in Rundu. Chocolate cake N$150, Vanilla cake N$130, Cupcakes N$15 each. Open Mon-Sat 8am-5pm. Location: Rundu town center, near the market.',
  '+264812345678'
);
