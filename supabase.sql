-- Ehood V5 database setup
-- 1) Create a Supabase project.
-- 2) Replace OWNER_EMAIL below with YOUR email, then run this whole file in Supabase SQL Editor.
-- 3) Put the project's URL and anon/publishable key into config.js.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  nickname text not null default '',
  bio text not null default '',
  avatar text,
  verified boolean not null default false,
  owner boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Prevent clients from assigning owner/verified status themselves.
create or replace function public.keep_verified_server_controlled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.owner := (lower(coalesce((select email from auth.users where id = new.id),'')) = 'threatenn@outlook.com');
    new.verified := new.owner;
  elsif tg_op = 'UPDATE' then
    new.verified := old.verified;
    new.owner := old.owner;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_verified_guard on public.profiles;
create trigger profiles_verified_guard
before insert or update on public.profiles
for each row execute function public.keep_verified_server_controlled();

-- Replace this email with the Ehood owner's email BEFORE running.
create or replace function public.claim_ehood_owner()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare owner_email text := 'threatenn@outlook.com';
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> lower(owner_email) then
    return false;
  end if;
  update public.profiles set owner = true, verified = true where id = auth.uid();
  return found;
end;
$$;
revoke all on function public.claim_ehood_owner() from public;
grant execute on function public.claim_ehood_owner() to authenticated;

-- Signup trigger: create a blank profile automatically after Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, nickname, bio, avatar, owner, verified)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), 'user_' || substr(replace(new.id::text,'-',''),1,8)),
    coalesce(new.raw_user_meta_data->>'nickname',''),
    coalesce(new.raw_user_meta_data->>'bio',''),
    new.raw_user_meta_data->>'avatar',
    lower(coalesce(new.email,'')) = 'threatenn@outlook.com',
    lower(coalesce(new.email,'')) = 'threatenn@outlook.com'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helpful RPC for checking a username without exposing private Auth data.
create or replace function public.username_available(candidate text)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(both '@' from candidate))
  );
$$;
grant execute on function public.username_available(text) to anon, authenticated;

