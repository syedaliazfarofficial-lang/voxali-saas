-- check existing policies on profiles
select *
from pg_policies
where tablename = 'profiles';
-- check for triggers on auth.users
select *
from information_schema.triggers
where event_object_table = 'users'
    and event_object_schema = 'auth';
-- check for triggers on public.profiles
select *
from information_schema.triggers
where event_object_table = 'profiles'
    and event_object_schema = 'public';