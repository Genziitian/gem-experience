-- Seed catalog from current High Jewellery front-end data.
-- Run after creating your first admin user in Supabase Auth,
-- then: update public.profiles set role = 'super_admin' where email = 'you@example.com';

insert into public.categories (slug, name, kind, description, sort_order, published)
values
  ('high-jewellery', 'High Jewellery', 'high', 'Singular pieces, each cut from a stone we followed out of the ground.', 1, true),
  ('fine-jewellery', 'Fine Jewellery', 'fine', 'Everyday fine pieces.', 2, true),
  ('gemstones', 'Gemstones', 'gemstones', 'Museum-calibre stones.', 3, true)
on conflict (slug) do nothing;

insert into public.collections (slug, name, sort_order, published)
values
  ('tanzania-universe', 'Tanzania Universe', 1, true),
  ('origin', 'Origin', 2, true),
  ('nocturne', 'Nocturne', 3, true),
  ('heritage', 'Heritage', 4, true)
on conflict (slug) do nothing;

with cats as (
  select id, slug from public.categories
), cols as (
  select id, slug from public.collections
)
insert into public.products (
  slug, name, ref_code, materials, metal, product_type, occasion, carat, origin, story,
  collection_id, category_id, price_on_enquiry, is_gemstone, has_visualiser, visualiser, status, featured_sort
)
select * from (values
  (
    'weaver', 'Weaver', null, 'Tanzanite and Diamond', null, 'Necklaces', 'Gala', '—', '—', '',
    (select id from cols where slug = 'origin'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, true,
    '{"color":"#1e4a8c","accent":"#6b3fa0","ior":1.7,"cut":"brilliant","cutLabel":"Brilliant cut","attenuation":0.5}'::jsonb,
    'published', 1
  ),
  (
    'the-crown', 'The Crown', 'GEM-CRW-104', 'Natural Royal Blue Tanzanite Gemstone', null, 'Gemstones', 'Collector',
    '18.45ct total', 'Merelani Hills, Tanzania',
    'An extraordinary natural Tanzanite crystal formation of museum calibre, unearthed from the premier Merelani deposits of Tanzania.',
    (select id from cols where slug = 'heritage'),
    (select id from cats where slug = 'gemstones'),
    true, true, true,
    '{"color":"#153a7a","accent":"#5a2d8e","ior":1.7,"cut":"marquise","cutLabel":"Marquise brilliant","attenuation":0.45}'::jsonb,
    'published', 2
  ),
  (
    'jardin-bleu', 'Jardin Bleu', null, 'Tanzanite and Rose-Cut Diamond', '18k White Gold', 'Earrings', 'Collector', '—', '—', '',
    (select id from cols where slug = 'origin'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, true,
    '{"color":"#2456a0","accent":"#7a4cb0","ior":1.7,"cut":"pear","cutLabel":"Pear cut","attenuation":0.55}'::jsonb,
    'published', 3
  ),
  (
    'ember', 'Ember', null, 'Rubellite, Spinel and Diamond', '18k White Gold', 'Earrings', 'Gala', '—', '—', '',
    (select id from cols where slug = 'tanzania-universe'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, true,
    '{"color":"#9b1c3a","accent":"#d4546a","ior":1.62,"cut":"emerald","cutLabel":"Emerald cut","attenuation":0.6}'::jsonb,
    'published', 4
  ),
  (
    'serengeti', 'Wimbi', 'HJ-1042', '6.4ct Tanzanite, Diamond and Platinum', 'Platinum 950', 'Rings', 'Collector',
    '6.42ct', 'Merelani, Tanzania',
    'One rough stone, followed from the Merelani hills to the bench, cut to hold a single line of blue at the centre and set in a halo that disappears when worn.',
    (select id from cols where slug = 'tanzania-universe'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, true,
    '{"color":"#1a4588","accent":"#553a9a","ior":1.7,"cut":"oval","cutLabel":"Oval cut","attenuation":0.48}'::jsonb,
    'published', 5
  ),
  (
    'mahenge', 'Samaah', 'HJ-0994', 'Spinel, Diamond and Rose Gold', '18k Rose Gold', 'Bracelets', 'Collector',
    '22.60ct total', 'Mahenge, Tanzania',
    'Mahenge spinel in the pink that made the deposit famous, held in rose gold links that take the colour warmer still.',
    (select id from cols where slug = 'origin'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, true,
    '{"color":"#c45a7a","accent":"#e8a0b4","ior":1.72,"cut":"cushion","cutLabel":"Cushion cut","attenuation":0.52}'::jsonb,
    'published', 6
  ),
  (
    'shamsa', 'Shamsa', null, 'Rubellite, Diamond and 18k Yellow Gold', '18k Yellow Gold', 'Necklaces', 'Gala', '—', '—', '',
    (select id from cols where slug = 'nocturne'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, false, '{}'::jsonb, 'published', 7
  ),
  (
    'kilimanjaro', 'Ocean Wave', 'HJ-1108', 'Tanzanite, Diamond and 18k White Gold', '18k White Gold', 'Necklaces', 'Gala',
    '41.80ct total', 'Merelani, Tanzania',
    'Thirty-one graduated tanzanites, matched over four years, laid along a collar that sits flat against the skin.',
    (select id from cols where slug = 'tanzania-universe'),
    (select id from cats where slug = 'high-jewellery'),
    true, false, false, '{}'::jsonb, 'published', 8
  )
) as v(
  slug, name, ref_code, materials, metal, product_type, occasion, carat, origin, story,
  collection_id, category_id, price_on_enquiry, is_gemstone, has_visualiser, visualiser, status, featured_sort
)
on conflict (slug) do nothing;

insert into public.product_images (product_id, url, alt, sort_order)
select p.id, '/high-jewellery/img/' || p.slug || '.webp', p.name, 0
from public.products p
where not exists (
  select 1 from public.product_images i where i.product_id = p.id
);