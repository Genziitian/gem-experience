-- Bring The House back into the primary menu now that it has pages behind it:
-- /the-house/ and /lookbook/. Only entries with a real page are published;
-- the planned ones (Our History, Timeline, Craftsmanship, Sustainability,
-- Maasai Women Project, Our Museum, Services and its two children) stay in the
-- table, unpublished, so the admin can switch each one on when its page exists.
--
-- Safe to re-run.

update public.nav_items
   set published = true, href = 'the-house/'
 where location = 'primary' and parent_id is null and label = 'The House';

-- the old "About" sub-heading becomes the link to the page itself
update public.nav_items as child
   set href = 'the-house/', is_heading = false, published = true, sort_order = 0
  from public.nav_items as parent
 where child.parent_id = parent.id
   and parent.label = 'The House' and parent.parent_id is null
   and child.label = 'About';

update public.nav_items as child
   set published = false
  from public.nav_items as parent
 where child.parent_id = parent.id
   and parent.label = 'The House' and parent.parent_id is null
   and child.label in ('Our History', 'Timeline', 'Craftsmanship', 'Sustainability',
                       'Maasai Women Project', 'Our Museum', 'Services',
                       'Upgrade Your Jewellery', 'Preserve Your Jewellery');

insert into public.nav_items (parent_id, location, label, href, is_heading, sort_order)
select p.id, 'primary', v.label, v.href, false, v.sort_order
from (values
  ('Lookbook', 'lookbook/', 1),
  ('Events & Exhibitions', 'events/', 2),
  ('Ateliers & stores', 'offices/', 3)
) as v(label, href, sort_order)
join (select id from public.nav_items
       where parent_id is null and location = 'primary' and label = 'The House') p on true
where not exists (select 1 from public.nav_items n where n.parent_id = p.id and n.label = v.label);
