
-- 1. Create a function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    -- If username is not provided, derive from email or use default
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', 'account_circle')
  );
  return new;
end;
$$;

-- 2. Create the trigger to execute the function on every insert to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. (Optional) Fix existing users who are missing a profile
insert into public.profiles (id, email, username, avatar_url)
select 
  id, 
  email, 
  split_part(email, '@', 1), 
  'account_circle'
from auth.users
where id not in (select id from public.profiles);
