-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'client')),
  name text not null,
  created_at timestamptz default now()
);

-- Projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  client_user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  framer_project_url text not null,
  framer_api_key_encrypted text not null,
  website_url text,
  created_at timestamptz default now()
);

-- Add website_url to existing projects table (run if table already exists)
-- alter table public.projects add column if not exists website_url text;

-- Add analytics columns (run if table already exists)
-- alter table public.projects add column if not exists analytics_data jsonb;
-- alter table public.projects add column if not exists analytics_updated_at timestamptz;

-- Change requests table
create table public.change_requests (
  id uuid default gen_random_uuid() primary key,
  client_user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'done')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.change_requests enable row level security;

create policy "client own requests"
  on public.change_requests for all
  using (client_user_id = auth.uid())
  with check (client_user_id = auth.uid());

create policy "admin requests all"
  on public.change_requests for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Run if table already exists:
-- (copy the create table statement above)

-- Add attachments column to existing change_requests table:
-- alter table public.change_requests add column if not exists attachments jsonb default '[]'::jsonb;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- profiles: user can read own profile
create policy "own profile read"
  on public.profiles for select
  using (auth.uid() = id);

-- profiles: admins can read all (for admin panel)
create policy "admin profiles read"
  on public.profiles for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- projects: client can read own
create policy "own project read"
  on public.projects for select
  using (client_user_id = auth.uid());

-- projects: admins can do everything
create policy "admin projects all"
  on public.projects for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
