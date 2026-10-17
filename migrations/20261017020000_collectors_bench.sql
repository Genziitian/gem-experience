-- World of Preciousness is renamed The Collector’s Bench. The pages keep their
-- address (/world-of-preciousness/) so existing links and search rankings hold;
-- only the name people read changes. Safe to re-run.

update public.nav_items
   set label = 'The Collector’s Bench'
 where label = 'World of Preciousness';
