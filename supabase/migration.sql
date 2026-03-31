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
  created_at timestamptz default now()
);

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
