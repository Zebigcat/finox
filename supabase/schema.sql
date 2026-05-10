-- ============================================================
-- Finox — Supabase schema
-- Paste this into the Supabase SQL Editor and click "Run"
-- ============================================================

-- Transactions table
create table if not exists public.transactions (
  id          text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  date        date        not null,
  label       text        not null,
  merchant    text        not null,
  amount      numeric(12, 2) not null,
  category    text        not null default 'Autre',
  emoji       text        not null default '📦',
  balance     numeric(12, 2),
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- Row Level Security
alter table public.transactions enable row level security;

create policy "select_own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "delete_own" on public.transactions
  for delete using (auth.uid() = user_id);
