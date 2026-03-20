-- =============================================
-- Container Solutions — Supabase SQL Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- 1. Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz default now()
);

alter table public.organizations enable row level security;

-- Org visible to its members
create policy "Org members can read org"
  on public.organizations for select
  using (
    id in (select org_id from public.org_members where user_id = auth.uid())
  );

-- Anyone can create an org
create policy "Authenticated users can create org"
  on public.organizations for insert
  with check (auth.uid() is not null);


-- 3. Organization members
create table public.org_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  primary key (user_id, org_id)
);

alter table public.org_members enable row level security;

create policy "Users can see own memberships"
  on public.org_members for select
  using (user_id = auth.uid());

create policy "Users can see co-members in their orgs"
  on public.org_members for select
  using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "Authenticated users can join org"
  on public.org_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave org"
  on public.org_members for delete
  using (user_id = auth.uid());


-- 4. Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  customer_name text not null default '',
  project_name text not null,
  project_code text not null default '',
  config jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

-- Owner has full access
create policy "Owner can do anything with own projects"
  on public.projects for all
  using (owner_id = auth.uid());

-- Org members can read org projects
create policy "Org members can read org projects"
  on public.projects for select
  using (
    org_id is not null
    and org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

-- Org members can update org projects
create policy "Org members can update org projects"
  on public.projects for update
  using (
    org_id is not null
    and org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();


-- 5. STEP file library
create table public.step_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  file_size_bytes bigint default 0,
  created_at timestamptz default now()
);

alter table public.step_library enable row level security;

create policy "Owner can manage own files"
  on public.step_library for all
  using (owner_id = auth.uid());

create policy "Org members can read org files"
  on public.step_library for select
  using (
    org_id is not null
    and org_id in (select org_id from public.org_members where user_id = auth.uid())
  );


-- 6. Storage bucket for STEP files
-- NOTE: Run this separately if the SQL editor doesn't support storage API:
--   Go to Storage → New Bucket → name: "step-files", Public: OFF
-- Or run:
insert into storage.buckets (id, name, public)
values ('step-files', 'step-files', false)
on conflict (id) do nothing;

-- Storage RLS policies
create policy "Users can upload own STEP files"
  on storage.objects for insert
  with check (
    bucket_id = 'step-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own STEP files"
  on storage.objects for select
  using (
    bucket_id = 'step-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own STEP files"
  on storage.objects for delete
  using (
    bucket_id = 'step-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Org members can read files uploaded by co-members
create policy "Org members can read shared STEP files"
  on storage.objects for select
  using (
    bucket_id = 'step-files'
    and (storage.foldername(name))[1] in (
      select om2.user_id::text
      from public.org_members om1
      join public.org_members om2 on om1.org_id = om2.org_id
      where om1.user_id = auth.uid()
    )
  );
