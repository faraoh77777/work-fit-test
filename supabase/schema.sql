-- AI FIT try-on usage limit (run once in Supabase SQL Editor)
-- device = anonymous id made by the browser, '*' = global total

create table if not exists public.tryon_usage (
  device text not null,
  day    date not null default ((now() at time zone 'utc')::date),
  n      int  not null default 0,
  primary key (device, day)
);
alter table public.tryon_usage enable row level security;

create or replace function public.tryon_take(p_device text, p_dev_limit int, p_global_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d int;
  g int;
  today date := (now() at time zone 'utc')::date;
begin
  insert into tryon_usage(device, day, n) values ('*', today, 0) on conflict do nothing;
  insert into tryon_usage(device, day, n) values (p_device, today, 0) on conflict do nothing;
  select n into g from tryon_usage where device = '*' and day = today for update;
  select n into d from tryon_usage where device = p_device and day = today for update;
  if g >= p_global_limit or d >= p_dev_limit then
    return false;
  end if;
  update tryon_usage set n = n + 1 where day = today and device in ('*', p_device);
  return true;
end
$$;

create or replace function public.tryon_refund(p_device text)
returns void
language sql
security definer
set search_path = public
as $$
  update tryon_usage set n = greatest(n - 1, 0)
  where day = (now() at time zone 'utc')::date and device in ('*', p_device);
$$;

revoke all on function public.tryon_take(text, int, int) from public, anon, authenticated;
revoke all on function public.tryon_refund(text) from public, anon, authenticated;
grant execute on function public.tryon_take(text, int, int) to service_role;
grant execute on function public.tryon_refund(text) to service_role;

-- check: table_ok should be 1 and functions_ok should be 2
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'tryon_usage') as table_ok,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('tryon_take', 'tryon_refund')) as functions_ok;
