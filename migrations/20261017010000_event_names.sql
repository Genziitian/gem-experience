-- The shows' proper names, as the house wants them written.
-- Safe to re-run: each update only touches the row still carrying its old name.

update public.events set title = 'Jewels of the World'
 where title = 'Riyadh Show' and starts_on = '2026-10-11';
update public.events set title = 'Jewellery and Watch Show'
 where title = 'Abu Dhabi Show' and starts_on = '2026-11-11';
update public.events set title = 'Jewellery & Gem World'
 where title = 'Hong Kong Show' and starts_on = '2026-09-14';
update public.events set title = 'Evoluzione X Gem Experience'
 where title = 'Chennai Show' and starts_on = '2026-09-09';
