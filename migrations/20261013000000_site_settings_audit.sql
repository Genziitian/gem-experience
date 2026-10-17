-- --------------------------------------------------------------- audit trail
--
-- site_settings_audit (20260923000000_activity_log.sql) ran the shared
-- log_content_change(), which reads coalesce(new.id, old.id). site_settings is
-- keyed by `key` and has no id, so every insert, update or delete on it failed
-- with "record new has no field id", every settings save in the admin included.
-- Same fix as faq_categories: its own small function.

create or replace function public.log_site_setting_change()
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
    coalesce(new.key, old.key),
    case when tg_op = 'DELETE'
         then jsonb_build_object('before', to_jsonb(old))
         else jsonb_build_object('after', to_jsonb(new)) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit after insert or update or delete on public.site_settings
  for each row execute function public.log_site_setting_change();

-- ------------------------------------------------------- Dubai office number
--
-- The Dubai line is +971 56 720 3896; +971 58 865 1095 was wrong.

update public.offices
   set phone = '+971 56 720 3896', tel = '+971567203896'
 where tel = '+971588651095';

update public.site_settings
   set value = replace(replace(value::text,
         '+971 58 865 1095', '+971 56 720 3896'),
         '971588651095', '971567203896')::jsonb
 where key = 'contact';
