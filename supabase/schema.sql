-- Lumen Finance — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  amount      numeric(14, 2) not null check (amount > 0),
  type        text not null check (type in ('income', 'expense')),
  category    text not null default 'other',
  date        date not null default current_date,
  note        text check (note is null or char_length(note) <= 240),
  created_at  timestamptz not null default now()
);

create index if not exists transactions_date_idx on public.transactions (date desc, created_at desc);
create index if not exists transactions_type_idx on public.transactions (type);

alter table public.transactions enable row level security;

-- Phase 1 (no auth yet): the anon key may read and write.
-- Anyone holding the anon key + URL can touch this table, so swap these for
-- per-user policies (auth.uid() = user_id) as soon as sign-in is added.
drop policy if exists "anon read transactions" on public.transactions;
drop policy if exists "anon insert transactions" on public.transactions;
drop policy if exists "anon delete transactions" on public.transactions;

create policy "anon read transactions"   on public.transactions for select to anon using (true);
create policy "anon insert transactions" on public.transactions for insert to anon with check (true);
create policy "anon delete transactions" on public.transactions for delete to anon using (true);
