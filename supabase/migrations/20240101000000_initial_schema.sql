-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  avatar_url text,
  posts_count integer default 0,
  clicks_count integer default 0,
  wallet text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Posts table
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  polymarket_url text not null,
  market_title text,
  yes_price numeric(5,2),
  no_price numeric(5,2),
  ref_code text default 'FLARIFYAPP',
  likes integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Comments table
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Post clicks tracking
create table public.post_clicks (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Likes table (for tracking who liked what)
create table public.post_likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Indexes for performance
create index posts_user_id_idx on public.posts(user_id);
create index posts_created_at_idx on public.posts(created_at desc);
create index comments_post_id_idx on public.comments(post_id);
create index comments_user_id_idx on public.comments(user_id);
create index post_clicks_post_id_idx on public.post_clicks(post_id);
create index post_clicks_user_id_idx on public.post_clicks(user_id);
create index post_likes_post_id_idx on public.post_likes(post_id);
create index post_likes_user_id_idx on public.post_likes(user_id);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_clicks enable row level security;
alter table public.post_likes enable row level security;

-- RLS Policies for users
create policy "Users can view all profiles"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- RLS Policies for posts
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- RLS Policies for comments
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- RLS Policies for post_clicks
create policy "Anyone can insert clicks"
  on public.post_clicks for insert
  with check (true);

create policy "Users can view all clicks"
  on public.post_clicks for select
  using (true);

-- RLS Policies for post_likes
create policy "Likes are viewable by everyone"
  on public.post_likes for select
  using (true);

create policy "Authenticated users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to increment post count
create or replace function increment_posts_count()
returns trigger as $$
begin
  update public.users
  set posts_count = posts_count + 1
  where id = new.user_id;
  return new;
end;
$$ language plpgsql;

create trigger on_post_created
  after insert on public.posts
  for each row execute procedure increment_posts_count();

-- Function to decrement post count
create or replace function decrement_posts_count()
returns trigger as $$
begin
  update public.users
  set posts_count = posts_count - 1
  where id = old.user_id;
  return old;
end;
$$ language plpgsql;

create trigger on_post_deleted
  after delete on public.posts
  for each row execute procedure decrement_posts_count();

-- Function to update comment count
create or replace function update_comment_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts
    set comments_count = comments_count + 1
    where id = new.post_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.posts
    set comments_count = comments_count - 1
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure update_comment_count();

-- Function to update like count
create or replace function update_like_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts
    set likes = likes + 1
    where id = new.post_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.posts
    set likes = likes - 1
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger on_like_change
  after insert or delete on public.post_likes
  for each row execute procedure update_like_count();
