-- Fix the handle_new_user trigger function
-- The previous version had a bug where it was trying to use new.id for both user and workspace
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  -- Create workspace first
  insert into public.workspaces (name)
  values (new.email || '''s Workspace')
  returning id into new_workspace_id;
  
  -- Create user profile linked to workspace
  insert into public.user_profiles (user_id, workspace_id)
  values (new.id, new_workspace_id);
  
  return new;
end;
$$;