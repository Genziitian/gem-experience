-- Hide four sections from the primary menu: Gemstones & Mining,
-- Engagement & Bridal, Gifts and The House.
--
-- Unpublishing a section is enough: the storefront only reads published
-- rows, and children whose parent is missing are dropped. Flip published back
-- to true (here or in the admin) to bring one back. The Gifts page itself
-- stays up at /gifts/; only its menu entry goes.
--
-- Safe to re-run.

update public.nav_items
   set published = false
 where location = 'primary'
   and parent_id is null
   and label in ('Gemstones & Mining', 'Engagement & Bridal', 'Gifts', 'The House');
