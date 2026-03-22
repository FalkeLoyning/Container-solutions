-- =============================================
-- Container Solutions — Share Link Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Shared container configurations (public access via token)
create table public.shared_configs (
  id uuid primary key default gen_random_uuid(),
  config jsonb not null,
  project_name text not null default '',
  customer_name text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.shared_configs enable row level security;

-- Anyone can read (public share links, no auth needed)
create policy "Anyone can read shared configs"
  on public.shared_configs for select
  using (true);

-- Only authenticated users can create shares
create policy "Authenticated users can create shares"
  on public.shared_configs for insert
  with check (auth.uid() is not null);

-- Creator can delete own shares
create policy "Creator can delete own shares"
  on public.shared_configs for delete
  using (created_by = auth.uid());
