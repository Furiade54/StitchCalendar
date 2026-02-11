-- Create events table
create table public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  event_type text check (event_type in ('cita', 'cumpleaños', 'recordatorio', 'reunión')),
  status text check (status in ('programado', 'en_curso', 'completado', 'vencido', 'cancelado')) default 'programado',
  is_recurring boolean default false,
  notes text,
  icon text,
  color_class text,
  icon_bg_class text,
  meeting_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.events enable row level security;

-- Create policies
create policy "Users can view their own events"
  on public.events for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own events"
  on public.events for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own events"
  on public.events for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own events"
  on public.events for delete
  using ( auth.uid() = user_id );

-- Create index for faster querying by date range
create index events_user_id_idx on public.events (user_id);
create index events_start_date_idx on public.events (start_date);
