-- The Fine Jewellery menu lists every way into the shop: each kind of piece,
-- then every collection. It used to stop at four collections (Bloom, Safar,
-- Tide, Swirl) because later collections were added to the site but never to
-- the menu. Safe to re-run: a row is inserted only when its label is missing
-- under Fine Jewellery, and every row is then re-linked and re-ordered.

create temporary table fj_menu (label text, href text, is_heading boolean, sort_order int);
insert into fj_menu values
  ('Shop all',       'fine-jewellery/#/shop',           false,  0),
  ('By piece',       null,                              true,  10),
  ('Rings',          'fine-jewellery/#/shop/rings',     false, 11),
  ('Earrings',       'fine-jewellery/#/shop/earrings',  false, 12),
  ('Necklaces',      'fine-jewellery/#/shop/necklaces', false, 13),
  ('Pendants',       'fine-jewellery/#/shop/pendants',  false, 14),
  ('Bracelets',      'fine-jewellery/#/shop/bracelets', false, 15),
  ('Collections',    null,                              true,  20),
  ('Bloom',          'fine-jewellery/#/bloom',          false, 21),
  ('Safar',          'fine-jewellery/#/safar',          false, 22),
  ('Dazzle',         'fine-jewellery/#/dazzle',         false, 23),
  ('Entwine',        'fine-jewellery/#/entwine',        false, 24),
  ('Dome',           'fine-jewellery/#/dome',           false, 25),
  ('Tide',           'fine-jewellery/#/tide',           false, 26),
  ('Swirl',          'fine-jewellery/#/swirl',          false, 27),
  ('Spectrum',       'fine-jewellery/#/spectrum',       false, 28),
  ('Flare',          'fine-jewellery/#/flare',          false, 29),
  ('Royal Starling', 'fine-jewellery/#/royal-starling', false, 30),
  ('Multi Colour',   'fine-jewellery/#/multi-colour',   false, 31),
  ('Shamsa Fine',    'fine-jewellery/#/shamsa-fine',    false, 32);

insert into public.nav_items (parent_id, location, label, href, is_heading, sort_order, published)
select p.id, 'primary', m.label, m.href, m.is_heading, m.sort_order, true
  from fj_menu m
  join public.nav_items p
    on p.location = 'primary' and p.parent_id is null and p.label = 'Fine Jewellery'
 where not exists (
   select 1 from public.nav_items n where n.parent_id = p.id and n.label = m.label
 );

update public.nav_items n
   set href = m.href, is_heading = m.is_heading, sort_order = m.sort_order, published = true
  from fj_menu m, public.nav_items p
 where p.location = 'primary' and p.parent_id is null and p.label = 'Fine Jewellery'
   and n.parent_id = p.id and n.label = m.label;

drop table fj_menu;

-- Check: should list 20 rows, Shop all first and Shamsa Fine last.
select n.label, n.is_heading, n.href
  from public.nav_items n
  join public.nav_items p on p.id = n.parent_id and p.label = 'Fine Jewellery' and p.parent_id is null
 order by n.sort_order;
