-- Create user_profiles table to link users to workspaces
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" 
  ON public.user_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update workspaces RLS to allow users to manage their own workspace
DROP POLICY IF EXISTS "Allow all authenticated users to read workspaces" ON public.workspaces;

CREATE POLICY "Users can read own workspace" 
  ON public.workspaces 
  FOR SELECT 
  USING (id IN (SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert workspaces" 
  ON public.workspaces 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own workspace" 
  ON public.workspaces 
  FOR UPDATE 
  USING (id IN (SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Update products RLS to use workspace isolation
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;

CREATE POLICY "Users can read own workspace products" 
  ON public.products 
  FOR SELECT 
  USING (workspace_id IN (SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workspace products" 
  ON public.products 
  FOR INSERT 
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own workspace products" 
  ON public.products 
  FOR UPDATE 
  USING (workspace_id IN (SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own workspace products" 
  ON public.products 
  FOR DELETE 
  USING (workspace_id IN (SELECT workspace_id FROM public.user_profiles WHERE user_id = auth.uid()));