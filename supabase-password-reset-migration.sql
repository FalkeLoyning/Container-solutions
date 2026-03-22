-- =============================================
-- Container Solutions — Password Reset Requests
-- Run this in Supabase SQL Editor
-- =============================================

-- Table for storing password reset requests (admin handles them in-app)
create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz default now()
);

alter table public.password_reset_requests enable row level security;

-- Anyone can insert (unauthenticated users requesting resets)
create policy "Anyone can request password reset"
  on public.password_reset_requests for insert
  with check (true);

-- Only authenticated users (admins) can read
create policy "Authenticated users can read reset requests"
  on public.password_reset_requests for select
  using (auth.uid() is not null);

-- Only authenticated users (admins) can update
create policy "Authenticated users can update reset requests"
  on public.password_reset_requests for update
  using (auth.uid() is not null);
