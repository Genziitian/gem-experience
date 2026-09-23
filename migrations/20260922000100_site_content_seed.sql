-- Seed for site content. Generated from the storefront's own hard-coded
-- values, so the database starts out rendering exactly what ships today.
-- Safe to re-run: inserts are guarded on a natural key.

-- ------------------------------------------------------------ navigation

insert into public.nav_items (parent_id, location, label, href, is_heading, sort_order)
select null, v.location, v.label, v.href, false, v.sort_order
from (values
  ('primary', 'High Jewellery', 'high-jewellery/', 0),
  ('primary', 'Fine Jewellery', 'fine-jewellery/', 1),
  ('primary', 'World of Preciousness', 'world-of-preciousness/', 2),
  ('primary', 'Gemstones & Mining', null, 3),
  ('primary', 'Engagement & Bridal', null, 4),
  ('primary', 'Gifts', 'gifts/', 5),
  ('primary', 'The House', null, 6),
  ('secondary', 'Find our store', 'offices/', 0),
  ('secondary', 'Book an appointment', 'appointment/', 1),
  ('secondary', 'Request a quotation', 'quotation/', 2),
  ('secondary', 'My account', 'account/', 3),
  ('secondary', 'Contact us', 'contact/', 4),
  ('secondary', 'Legal', 'legal/', 5)
) as v(location, label, href, sort_order)
where not exists (select 1 from public.nav_items n where n.label = v.label and n.location = v.location and n.parent_id is null);

insert into public.nav_items (parent_id, location, label, href, is_heading, sort_order)
select p.id, 'primary', v.label, v.href, v.is_heading, v.sort_order
from (values
  ('Fine Jewellery', 'Shop all', 'fine-jewellery/#/shop', false, 0),
  ('Fine Jewellery', 'Bloom', 'fine-jewellery/#/bloom', false, 1),
  ('Fine Jewellery', 'Safar', 'fine-jewellery/#/safar', false, 2),
  ('Fine Jewellery', 'Tide', 'fine-jewellery/#/tide', false, 3),
  ('Fine Jewellery', 'Swirl', 'fine-jewellery/#/swirl', false, 4),
  ('World of Preciousness', 'Introduction', 'world-of-preciousness/', false, 0),
  ('World of Preciousness', 'Tanzanite', 'world-of-preciousness/tanzanite/', false, 1),
  ('World of Preciousness', 'Spinel', 'world-of-preciousness/spinel/', false, 2),
  ('World of Preciousness', 'Tsavorite', null, false, 3),
  ('World of Preciousness', 'Rhodolite', null, false, 4),
  ('World of Preciousness', 'Malaya Garnet', null, false, 5),
  ('The House', 'About', null, true, 0),
  ('The House', 'Our History', null, false, 1),
  ('The House', 'Timeline', null, false, 2),
  ('The House', 'Craftsmanship', null, false, 3),
  ('The House', 'Sustainability', null, false, 4),
  ('The House', 'Maasai Women Project', null, false, 5),
  ('The House', 'Our Museum', null, false, 6),
  ('The House', 'Services', null, true, 7),
  ('The House', 'Upgrade Your Jewellery', null, false, 8),
  ('The House', 'Preserve Your Jewellery', null, false, 9)
) as v(parent_label, label, href, is_heading, sort_order)
join (select id, label from public.nav_items where parent_id is null and location = 'primary') p
  on p.label = v.parent_label
where not exists (select 1 from public.nav_items n where n.parent_id = p.id and n.label = v.label);

-- --------------------------------------------------------------- offices

insert into public.offices (kind, name, region, address, phone, tel, image, map_query, sort_order)
select * from (values
  ('atelier', 'Blue Plaza Museum', 'Tanzania', 'India Street Blue Plaza, 3rd Floor, Tanzania', '+255 767 600 99', '+25576760099', '../img/offices/blue-plaza.jpg', 'Blue Plaza Museum India Street Arusha Tanzania', 0),
  ('atelier', 'Gem Experience, Dubai', 'United Arab Emirates', '25H, 25th floor, Jumeirah Lake Towers, Dubai, United Arab Emirates', '+971 58 865 1095', '+971588651095', '../img/offices/dubai.jpg', 'Gem Experience 25H Jumeirah Lake Towers Dubai', 1),
  ('atelier', 'Gem Experience, India', 'India', 'Ground floor, Plot No. 93, Opposite Sanghi Farm, Tonk Road, Kailash Puri, Jaipur, Rajasthan', '+91 73000 43093', '+917300043093', '../img/offices/india.jpg', 'Gem Experience Plot 93 Tonk Road Kailash Puri Jaipur', 2),
  ('store', 'Manyara Airport', null, 'Manyara Airstrip, Nr Karatu, C/o Tanzanite Experience, India Street, Arusha, Arusha 2706, Tanzania', null, null, '../img/offices/manyara-airport.jpg', 'Manyara Airport Karatu Tanzania', 0),
  ('store', 'Arusha Coffee Lodge', null, 'Coffee Lodge, India Street Blue Plaza TZ, Arusha 2706, Tanzania', null, null, '../img/offices/arusha-coffee.jpg', 'Arusha Coffee Lodge Tanzania', 1),
  ('store', 'Manyara Kibaoni', null, 'Manyara Kibaoni TZ, 2706, Tanzania', null, null, '../img/offices/manyara-kibaoni.jpg', 'Manyara Kibaoni Tanzania', 2),
  ('store', 'Kilimanjaro Airport', null, 'Kilimanjaro Airport Rd, Tanzania', null, null, '../img/offices/kilimanjaro.jpg', 'Kilimanjaro International Airport', 3),
  ('store', 'Zanzibar Serena', null, 'Zanzibar Serena Hotel, Shangani St, Zanzibar 2706, Tanzania', null, null, '../img/offices/zanzibar.jpg', 'Zanzibar Serena Hotel Shangani', 4),
  ('store', 'Serengeti Visitors Centre', null, 'Serengeti Visitors Centre, Seronera, Serengeti 2706, Tanzania', null, null, '../img/offices/serengeti-visitors.jpg', 'Serengeti Visitors Centre Seronera', 5),
  ('store', 'Four Points Arusha', null, 'Fire Road, Clocktower Roundabout, Plot 2, Arusha 23100, Tanzania', null, null, '../img/offices/four-points.jpg', 'Four Points by Sheraton Arusha', 6),
  ('store', 'Ngorongoro Serena', null, 'Ngorongoro Crater Conservancy, Arusha 2706, Tanzania', null, null, '../img/offices/ngorongoro.jpg', 'Ngorongoro Serena Safari Lodge', 7),
  ('store', 'Sasakwa Lodge', null, 'Singita Grumeti, Serengeti National Park, 31623, Tanzania', null, null, '../img/offices/sasakwa.jpg', 'Sasakwa Lodge Singita Grumeti', 8),
  ('store', 'Serengeti Serena', null, 'Serengeti National Park, Mara Region, Tanzania', null, null, '../img/offices/serengeti-serena.jpg', 'Serengeti Serena Safari Lodge', 9)
) as v(kind, name, region, address, phone, tel, image, map_query, sort_order)
where not exists (select 1 from public.offices o where o.name = v.name);

-- --------------------------------------------------------------- contact

update public.site_settings set value = '{"lede":"High Jewellery is quoted privately. Reach us on any of these and an adviser will reply within two working days.","email":"contact@gem-experience.com","hours":"Monday to Saturday, 9am – 7pm","lines":[{"region":"India","value":"+91 73000 43093","href":"https://wa.me/917300043093"},{"region":"United Arab Emirates","value":"+971 58 865 1095","href":"https://wa.me/971588651095"}]}'::jsonb where key = 'contact';

