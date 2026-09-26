-- Hide The House from the primary menu.
--
-- Unpublishing the section is enough: the storefront only reads published
-- rows, and children whose parent is missing are dropped. Flip published back
-- to true (here or in the admin) to bring it back.
--
-- Safe to re-run.

update public.nav_items
   set published = false
 where location = 'primary'
   and parent_id is null
   and label = 'The House';
