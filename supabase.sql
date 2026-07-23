alter table businesses add column if not exists business_id text unique;
alter table businesses add column if not exists business_info text;

insert into businesses (business_id, name, business_info)
values ('sarah-cakes', 'Sarah''s Cakes', 'We sell cakes and cupcakes in Rundu. Chocolate cake N$150, Vanilla cake N$130. Open Mon-Sat 8am-5pm.')
on conflict (business_id) do nothing;
