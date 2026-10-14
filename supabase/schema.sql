create table if not exists public.app_state (
  state_key text primary key,
  version bigint not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Service role only" on public.app_state;

create policy "Service role only"
  on public.app_state
  for all
  to service_role
  using (true)
  with check (true);

grant usage on schema public to service_role;
revoke all on table public.app_state from anon, authenticated;
grant all on table public.app_state to service_role;

create or replace function public.update_app_state(p_changes jsonb)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  entry record;
  current_version bigint;
begin
  for entry in
    select key, value from jsonb_each(p_changes) order by key
  loop
    select version into current_version
    from public.app_state
    where state_key = entry.key
    for update;

    if not found or current_version <> (entry.value->>'version')::bigint then
      return false;
    end if;
  end loop;

  for entry in
    select key, value from jsonb_each(p_changes) order by key
  loop
    update public.app_state
    set data = entry.value->'data',
        version = version + 1,
        updated_at = now()
    where state_key = entry.key;
  end loop;

  return true;
end;
$$;

revoke all on function public.update_app_state(jsonb) from public, anon, authenticated;
grant execute on function public.update_app_state(jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
