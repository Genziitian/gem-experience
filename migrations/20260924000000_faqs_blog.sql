-- FAQs and the blog, both written in the admin and read by the storefront.
--
-- FAQs are grouped by category, and every category is its own list: the
-- questions somebody asks about Fine Jewellery are not the ones they ask about
-- a gift. Categories are rows rather than a fixed enum so staff can open a new
-- one (High Jewellery, Orders & delivery) without a migration.
--
-- Only Fine Jewellery and Gifts are seeded. Every answer in the seed is taken
-- from copy the site already publishes — the care, delivery and returns
-- accordions on the Fine Jewellery product page, and the personalisation
-- section on Gifts — so nothing here states a policy the house has not.
--
-- Safe to re-run: every statement is guarded.

-- ----------------------------------------------------------- faq categories

create table if not exists public.faq_categories (
  -- the slug is the anchor on /faqs/ (#fine-jewellery) and what a page asks
  -- for when it embeds its own questions, so it is the key rather than a uuid
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null,
  intro text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists faq_categories_updated_at on public.faq_categories;
create trigger faq_categories_updated_at before update on public.faq_categories
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- faqs

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  -- on update cascade so renaming a category's slug carries its questions;
  -- on delete cascade so a deleted category does not leave orphans that no
  -- page can reach and no editor lists
  category text not null
    references public.faq_categories (slug) on update cascade on delete cascade,
  question text not null,
  -- light Markdown: paragraphs, **bold**, *italic*, [links](/appointment/)
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faqs_category_idx on public.faqs (category, sort_order);

drop trigger if exists faqs_updated_at on public.faqs;
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- blog posts

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  -- 'post' is the article template's own folder, so a post by that name
  -- would be shadowed by it
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug <> 'post'),
  title text not null,
  excerpt text,
  body text not null default '',            -- Markdown
  cover_image text,
  cover_alt text,
  author text,
  tags text[] not null default '{}',
  -- search engines and answer engines read these before the body
  seo_title text,
  seo_description text,
  published boolean not null default false,
  -- a post goes live when published is on AND this moment has passed, so a
  -- post can be scheduled by publishing it with a future date
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_live_idx
  on public.blog_posts (published, published_at desc);

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- RLS

alter table public.faq_categories enable row level security;
alter table public.faqs           enable row level security;
alter table public.blog_posts     enable row level security;

drop policy if exists "Public read published faq categories" on public.faq_categories;
create policy "Public read published faq categories"
  on public.faq_categories for select using (published = true or public.is_staff());

drop policy if exists "Staff manage faq categories" on public.faq_categories;
create policy "Staff manage faq categories" on public.faq_categories
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Public read published faqs" on public.faqs;
create policy "Public read published faqs"
  on public.faqs for select using (published = true or public.is_staff());

drop policy if exists "Staff manage faqs" on public.faqs;
create policy "Staff manage faqs" on public.faqs
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Public read live posts" on public.blog_posts;
create policy "Public read live posts"
  on public.blog_posts for select using (
    (published = true and (published_at is null or published_at <= now()))
    or public.is_staff()
  );

drop policy if exists "Staff manage posts" on public.blog_posts;
create policy "Staff manage posts" on public.blog_posts
  for all using (public.is_staff()) with check (public.is_staff());

-- --------------------------------------------------------------- audit trail
--
-- log_content_change() comes from 20260922000000_site_content.sql and reads
-- coalesce(new.id, old.id). faq_categories is keyed by slug and has no id, so
-- it gets its own small function rather than a change to the shared one.

create or replace function public.log_faq_category_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.slug, old.slug),
    case when tg_op = 'DELETE'
         then jsonb_build_object('before', to_jsonb(old))
         else jsonb_build_object('after', to_jsonb(new)) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists faq_categories_audit on public.faq_categories;
create trigger faq_categories_audit after insert or update or delete on public.faq_categories
  for each row execute function public.log_faq_category_change();

drop trigger if exists faqs_audit on public.faqs;
create trigger faqs_audit after insert or update or delete on public.faqs
  for each row execute function public.log_content_change();

drop trigger if exists blog_posts_audit on public.blog_posts;
create trigger blog_posts_audit after insert or update or delete on public.blog_posts
  for each row execute function public.log_content_change();

-- --------------------------------------------------------------------- seed

insert into public.faq_categories (slug, label, intro, sort_order) values
  ('fine-jewellery', 'Fine Jewellery',
   'Pricing, stones, delivery and care for the Bloom, Safar, Tide and Swirl collections.', 0),
  ('gifts', 'Gifts',
   'The handwritten card, the box, and choosing a piece for someone else.', 1)
on conflict (slug) do nothing;

-- Seeded only into an empty category, so re-running this file never brings
-- back a question that staff have since deleted or reworded.
insert into public.faqs (category, question, answer, sort_order)
select v.category, v.question, v.answer, v.sort_order
from (values
  ('fine-jewellery', 'How are Fine Jewellery pieces priced?',
   'Every piece is priced on the stone it is set with, so prices are given on request. Add a piece to your cart and place an enquiry, and an adviser will confirm the price before any payment is taken.', 0),
  ('fine-jewellery', 'Which stones and metals do you use?',
   'The collections are set with coloured stones including tanzanite, pink spinel, mint garnet, aquamarine, rhodolite, spessartite, morganite and Malaya garnet, alongside diamonds, in white, rose or yellow gold. Each product page names the exact stones, carat weights and metal.', 1),
  ('fine-jewellery', 'Is the stone in my piece the one described?',
   'Yes. Every coloured stone is sourced and graded before it is set, so the carat weight and shape on the product page match the stone actually in the piece.', 2),
  ('fine-jewellery', 'How long does delivery take?',
   'In-stock pieces ship within 5–7 working days. Delivery is insured worldwide, and a signature is required on arrival.', 3),
  ('fine-jewellery', 'Can I return a piece?',
   'Returns are accepted within 15 days on unworn, unaltered pieces in their original packaging. Resized or engraved pieces are final sale.', 4),
  ('fine-jewellery', 'Can a ring be resized?',
   'Yes. Rings are resized, and necklaces and bracelets restrung, in our own workshop. Please allow two weeks.', 5),
  ('fine-jewellery', 'How should I care for my jewellery?',
   'Store each piece separately in its fitted pouch, away from direct light and heat. Our workshop will clean and check any piece at any time, without charge.', 6),
  ('fine-jewellery', 'Is there a guarantee?',
   'Every Fine Jewellery piece carries a lifetime guarantee against manufacturing defect.', 7),
  ('fine-jewellery', 'Can I see a piece before I buy it?',
   'Yes. [Book a private viewing](/appointment/) and an adviser will take you through the pieces, or [find the atelier nearest you](/offices/).', 8),

  ('gifts', 'Can I include a personal message?',
   'Yes. Write it on the [Gifts page](/gifts/#personalise), or from your bag, cart or checkout. The message is written by hand on a card and set inside the box.', 0),
  ('gifts', 'Is there a charge for gift wrapping or the card?',
   'No. Every gift leaves the workshop boxed and ribboned, and the handwritten card is included at no charge.', 1),
  ('gifts', 'How long can the message be?',
   'Up to 140 characters. Because the card is written by hand, three short lines fit comfortably.', 2),
  ('gifts', 'Can I change the message after placing my order?',
   'Yes. The message can be changed at any time before the piece ships. [Contact us](/contact/) with your order number.', 3),
  ('gifts', 'I am not sure what to choose. Can you help?',
   'The Gifts page gathers the pieces most often given, from pendants and studs to slim bracelets. For something more particular, [speak to an adviser](/contact/) or [book a private viewing](/appointment/).', 4)
) as v (category, question, answer, sort_order)
where not exists (select 1 from public.faqs f where f.category = v.category);

-- ------------------------------------------------------------------- menu
--
-- FAQs and the journal join the secondary list under the drawer, after Contact
-- and before Legal. Guarded by label so a re-run, or a row staff already added
-- by hand, is left alone.

insert into public.nav_items (location, label, href, sort_order)
select 'secondary', v.label, v.href, v.sort_order
from (values ('FAQs', 'faqs/', 5), ('Journal', 'blog/', 6)) as v (label, href, sort_order)
where not exists (
  select 1 from public.nav_items n
  where n.location = 'secondary' and n.parent_id is null and n.label = v.label
);

update public.nav_items set sort_order = 7
 where location = 'secondary' and parent_id is null and label = 'Legal' and sort_order = 5;
