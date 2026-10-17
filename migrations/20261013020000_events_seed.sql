-- The 2026 show calendar, from the team's events sheet.
--
-- The site splits upcoming from past by date on its own, so nothing here
-- marks a show as finished. Safe to re-run: a show already entered (same
-- title and first day) is skipped, so edits made in the admin are kept.

insert into public.events (title, kind, starts_on, ends_on, city, country, address)
select v.title, v.kind, v.starts_on::date, v.ends_on::date, v.city, v.country, v.address
from (values
  ('57th Jewellery Show',                         'Exhibition',   '2026-06-10', '2026-06-14', 'Sharjah',   'United Arab Emirates', null),
  ('Jewels of the World',                         'Exhibition',   '2026-06-15', '2026-06-19', 'Riyadh',    'Saudi Arabia',         null),
  ('Jewels of the World',                         'Exhibition',   '2026-06-23', '2026-06-26', 'Al Khobar', 'Saudi Arabia',         null),
  ('The Quorum',                                  'Private show', '2026-07-29', '2026-07-30', 'Hyderabad', 'India',                null),
  ('IIJS Premiere',                               'Exhibition',   '2026-08-05', '2026-08-09', 'Mumbai',    'India',                'Booth JIO-N-24D'),
  ('Evoluzione X Gem Experience',                 'Private show', '2026-09-09', '2026-09-10', 'Chennai',   'India',                null),
  ('Jewellery & Gem World',                       'Exhibition',   '2026-09-14', '2026-09-18', 'Hong Kong', null,                   null),
  ('22nd Doha Jewellery and Watches Exhibition',  'Exhibition',   '2026-09-28', '2026-10-03', 'Doha',      'Qatar',                null),
  ('58th Jewellery Show',                         'Exhibition',   '2026-09-30', '2026-10-04', 'Sharjah',   'United Arab Emirates', null),
  ('Jewels of the World',                         'Exhibition',   '2026-10-11', '2026-10-15', 'Riyadh',    'Saudi Arabia',         null),
  ('Jewellery and Watch Show',                    'Exhibition',   '2026-11-11', '2026-11-15', 'Abu Dhabi', 'United Arab Emirates', null)
) as v (title, kind, starts_on, ends_on, city, country, address)
where not exists (
  select 1 from public.events e where e.title = v.title and e.starts_on = v.starts_on::date
);
