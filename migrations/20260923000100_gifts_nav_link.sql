-- Point the Gifts menu entry at the page that now exists.
--
-- The menu moved into the database, and the seed was written before the Gifts
-- page was built — so the row carries href = null, which the storefront renders
-- as plain, unclickable text for a section with no page yet. That is the
-- correct behaviour for the rows that really have no page; it was simply out of
-- date for this one, and the database wins over the hard-coded fallback.
--
-- Safe to re-run.

update public.nav_items
   set href = 'gifts/'
 where location = 'primary'
   and parent_id is null
   and label = 'Gifts'
   and href is null;
