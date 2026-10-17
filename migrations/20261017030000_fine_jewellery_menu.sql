-- The Fine Jewellery menu lists every way into the shop: each kind of piece,
-- then every collection. It used to stop at four collections (Bloom, Safar,
-- Tide, Swirl) because later collections were added to the site but never to
-- the menu. Safe to re-run: rows are matched on label under Fine Jewellery and
-- inserted only when missing; existing rows are re-ordered and re-linked.

with fj as (
  select id from public.nav_items
   where location = 'primary' and parent_id is null and label = 'Fine Jewellery'
), wanted (label, href, is_heading, sort_order) as (values
  ('Shop all',       'fine-jewellery/#/shop',                false,  0),
  ('By piece',       null,                                   true,  10),
  ('Rings',          'fine-jewellery/#/shop/rings',          false, 11),
  ('Earrings',       'fine-jewellery/#/shop/earrings',       false, 12),
  ('Necklaces',      'fine-jewellery/#/shop/necklaces',      false, 13),
  ('Pendants',       'fine-jewellery/#/shop/pendants',       false, 14),
  ('Bracelets',      'fine-jewellery/#/shop/bracelets',      false, 15),
  ('Collections',    null,                                   true,  20),
  ('Bloom',          'fine-jewellery/#/bloom',               false, 21),
  ('Safar',          'fine-jewellery/#/safar',               false, 22),
  ('Dazzle',         'fine-jewellery/#/dazzle',              false, 23),
  ('Entwine',        'fine-jewellery/#/entwine',             false, 24),
  ('Dome',           'fine-jewellery/#/dome',                false, 25),
  ('Tide',           'fine-jewellery/#/tide',                false, 26),
  ('Swirl',          'fine-jewellery/#/swirl',               false, 27),
  ('Spectrum',       'fine-jewellery/#/spectrum',            false, 28),
  ('Flare',          'fine-jewellery/#/flare',               false, 29),
  ('Royal Starling', 'fine-jewellery/#/royal-starling',      false, 30),
  ('Multi Colour',   'fine-jewellery/#/multi-colour',        false, 31),
  ('Shamsa Fine',    'fine-jewellery/#/shamsa-fine',         false, 32)
), upd as (
  update public.nav_items n
     set href = w.href, is_heading = w.is_heading, sort_order = w.sort_order, published = true
    from wanted w, fj
   where n.parent_id = fj.id and n.label = w.label
  returning n.label
)
insert into public.nav_items (parent_id, location, label, href, is_heading, sort_order)
select fj.id, 'primary', w.label, w.href, w.is_heading, w.sort_order
  from wanted w, fj
 where not exists (select 1 from public.nav_items n where n.parent_id = fj.id and n.label = w.label);
