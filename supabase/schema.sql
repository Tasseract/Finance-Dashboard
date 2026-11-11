-- Lumen Finance — database schema
--
-- Run the whole file in the Supabase SQL editor. It is safe to run again: every statement is
-- idempotent, and it upgrades an older install (the phase-1 schema with open anon policies).
--
-- Access model
--   * Every transaction belongs to the account that created it. Another account can never read,
--     change or delete it, and a new account starts with nothing.
--   * Being signed in is not enough. A session must also be *verified*: either it passed the
--     one-time-code check (MFA, `aal2`), or it was started on a device this account has trusted.
--   * The anon key on its own can no longer read or write anything.

create schema if not exists private;

-- ---------------------------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------------------------

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  amount      numeric(14, 2) not null check (amount > 0),
  type        text not null check (type in ('income', 'expense')),
  category    text not null default 'other',
  date        date not null default current_date,
  note        text check (note is null or char_length(note) <= 240),
  created_at  timestamptz not null default now()
);

-- Upgrade path: installs created before sign-in existed have no owner column.
alter table public.transactions
  add column if not exists owner uuid default auth.uid() references auth.users (id) on delete cascade;

-- Rows written before sign-in existed have no owner. If exactly one account exists when this runs,
-- they are that account's. Otherwise they stay hidden (not deleted) until you claim them with:
--   update public.transactions set owner = '<your user id>' where owner is null;
do $$
declare
  only_user uuid;
begin
  if (select count(*) from auth.users) = 1 then
    select id into only_user from auth.users;
    update public.transactions set owner = only_user where owner is null;
  end if;
  if not exists (select 1 from public.transactions where owner is null) then
    alter table public.transactions alter column owner set not null;
  end if;
end
$$;

create index if not exists transactions_owner_date_idx
  on public.transactions (owner, date desc, created_at desc);
create index if not exists transactions_type_idx on public.transactions (type);
drop index if exists public.transactions_date_idx; -- superseded by the owner-leading index

-- ---------------------------------------------------------------------------------------------
-- Trusted devices
--
-- A device holds a random secret in its browser storage; only the SHA-256 of it is stored here.
-- After a password sign-in on such a device the session is recorded as trusted, so the account is
-- not asked for a one-time code again. These tables live in `private`, which the Data API does not
-- expose: they are reachable only through the functions further down.
-- ---------------------------------------------------------------------------------------------

create table if not exists private.trusted_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  token_hash    text not null unique,
  label         text not null check (char_length(label) between 1 and 80),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

create index if not exists trusted_devices_user_idx on private.trusted_devices (user_id);

create table if not exists private.trusted_sessions (
  session_id  uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  device_id   uuid not null references private.trusted_devices (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists trusted_sessions_user_idx on private.trusted_sessions (user_id);
create index if not exists trusted_sessions_device_idx on private.trusted_sessions (device_id);

alter table private.trusted_devices enable row level security;
alter table private.trusted_sessions enable row level security;
revoke all on private.trusted_devices from anon, authenticated;
revoke all on private.trusted_sessions from anon, authenticated;

-- True when the calling session passed MFA, or was started on a trusted device.
create or replace function private.session_is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    or exists (
      select 1
      from private.trusted_sessions s
      where s.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
        and s.user_id = (select auth.uid())
    );
$$;

-- Policies run as the calling role, so it needs to be able to reach this one helper.
grant usage on schema private to authenticated;
revoke execute on function private.session_is_verified() from public, anon;
grant execute on function private.session_is_verified() to authenticated;

-- Trust the device that holds `device_token`. Only possible straight after a one-time code.
create or replace function public.trust_device(device_token text, device_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sid uuid := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  hash text;
  dev uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if coalesce((select auth.jwt()) ->> 'aal', '') <> 'aal2' then
    raise exception 'Enter your one-time code before trusting a device' using errcode = '42501';
  end if;
  if device_token is null or char_length(device_token) < 32 then
    raise exception 'Device token is too short' using errcode = '22023';
  end if;

  hash := encode(sha256(convert_to(device_token, 'UTF8')), 'hex');

  insert into private.trusted_devices (user_id, token_hash, label)
  values (uid, hash, left(coalesce(nullif(btrim(device_label), ''), 'Unnamed device'), 80))
  on conflict (token_hash) do update
    set last_used_at = now(), label = excluded.label
    where private.trusted_devices.user_id = uid
  returning id into dev;

  if dev is null then
    raise exception 'That device token belongs to another account' using errcode = '42501';
  end if;

  if sid is not null then
    insert into private.trusted_sessions (session_id, user_id, device_id)
    values (sid, uid, dev)
    on conflict (session_id) do nothing;
  end if;

  return dev;
end;
$$;

-- Called after a password sign-in. Returns true, and marks the session verified, when this
-- browser holds the secret of a device the account has trusted.
create or replace function public.trust_session(device_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sid uuid := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  dev uuid;
begin
  if uid is null or sid is null or device_token is null then
    return false;
  end if;

  select d.id into dev
  from private.trusted_devices d
  where d.user_id = uid
    and d.token_hash = encode(sha256(convert_to(device_token, 'UTF8')), 'hex');

  if dev is null then
    return false;
  end if;

  update private.trusted_devices set last_used_at = now() where id = dev;

  -- housekeeping; a live session that outlasts this simply re-registers on its next page load
  delete from private.trusted_sessions
  where user_id = uid and created_at < now() - interval '1 year';

  insert into private.trusted_sessions (session_id, user_id, device_id)
  values (sid, uid, dev)
  on conflict (session_id) do nothing;

  return true;
end;
$$;

-- The account's trusted devices. `device_token` (optional) marks which one is this browser.
create or replace function public.list_trusted_devices(device_token text default null)
returns table (
  id uuid,
  label text,
  created_at timestamptz,
  last_used_at timestamptz,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.label,
    d.created_at,
    d.last_used_at,
    device_token is not null
      and d.token_hash = encode(sha256(convert_to(device_token, 'UTF8')), 'hex') as is_current
  from private.trusted_devices d
  where d.user_id = (select auth.uid())
    and (select private.session_is_verified())
  order by d.last_used_at desc;
$$;

-- Forget a device. Its sessions stop counting as verified immediately.
create or replace function public.revoke_trusted_device(device_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  removed integer;
begin
  if uid is null or not (select private.session_is_verified()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from private.trusted_devices d where d.id = device_id and d.user_id = uid;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke execute on function public.trust_device(text, text) from public, anon;
revoke execute on function public.trust_session(text) from public, anon;
revoke execute on function public.list_trusted_devices(text) from public, anon;
revoke execute on function public.revoke_trusted_device(uuid) from public, anon;
grant execute on function public.trust_device(text, text) to authenticated;
grant execute on function public.trust_session(text) to authenticated;
grant execute on function public.list_trusted_devices(text) to authenticated;
grant execute on function public.revoke_trusted_device(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Row-level security on transactions
-- ---------------------------------------------------------------------------------------------

alter table public.transactions enable row level security;

-- the phase-1 policies let anyone holding the anon key read and write
drop policy if exists "anon read transactions" on public.transactions;
drop policy if exists "anon insert transactions" on public.transactions;
drop policy if exists "anon delete transactions" on public.transactions;
revoke all on public.transactions from anon;

-- newer Supabase projects do not expose tables to the Data API until privileges are granted
grant select, insert, delete on public.transactions to authenticated;

drop policy if exists "owner reads own transactions" on public.transactions;
drop policy if exists "owner adds own transactions" on public.transactions;
drop policy if exists "owner deletes own transactions" on public.transactions;

create policy "owner reads own transactions" on public.transactions
  for select to authenticated
  using (owner = (select auth.uid()) and (select private.session_is_verified()));

create policy "owner adds own transactions" on public.transactions
  for insert to authenticated
  with check (owner = (select auth.uid()) and (select private.session_is_verified()));

create policy "owner deletes own transactions" on public.transactions
  for delete to authenticated
  using (owner = (select auth.uid()) and (select private.session_is_verified()));
