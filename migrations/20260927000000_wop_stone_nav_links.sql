-- Point the Tsavorite, Rhodolite and Malaya Garnet menu entries at the pages
-- that now exist.
--
-- The seed gave these rows href = null because their pages had not been
-- built, and the storefront renders a null href as plain, unclickable text.
-- The database wins over the hard-coded fallback in site-nav.js, so fixing
-- that file alone does not reach the live menu.
--
-- Safe to re-run.

update public.nav_items as child
   set href = v.href
  from (values
         ('Tsavorite',     'world-of-preciousness/tsavorite/'),
         ('Rhodolite',     'world-of-preciousness/rhodolite/'),
         ('Malaya Garnet', 'world-of-preciousness/malaya-garnet/')
       ) as v(label, href),
       public.nav_items as parent
 where child.parent_id = parent.id
   and parent.label = 'World of Preciousness'
   and child.label = v.label
   and child.href is null;
