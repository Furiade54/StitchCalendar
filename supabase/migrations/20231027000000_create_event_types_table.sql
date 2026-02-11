-- Create a table for user-defined event types
create table public.event_types (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text not null default 'event',
  color_class text not null default 'text-slate-500',
  icon_bg_class text not null default 'bg-slate-100',
  requires_end_time boolean default true,
  created_at timestamp with time zone default now(),
  
  -- Prevent duplicate names for the same user
  constraint unique_type_name_per_user unique (user_id, name)
);

-- Set up RLS
alter table public.event_types enable row level security;

create policy "Users can view their own event types"
  on event_types for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own event types"
  on event_types for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own event types"
  on event_types for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own event types"
  on event_types for delete
  using ( auth.uid() = user_id );

-- Insert default types for new users via trigger (optional, but good practice)
-- This would be handled by a function similar to handle_new_user
