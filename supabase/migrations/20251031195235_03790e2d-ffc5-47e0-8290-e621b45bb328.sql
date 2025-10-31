-- Add business profile fields to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS business_description TEXT,
ADD COLUMN IF NOT EXISTS business_category TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_website TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}';

-- Add constraint for description length (WhatsApp limit)
ALTER TABLE workspaces 
ADD CONSTRAINT business_description_length 
CHECK (char_length(business_description) <= 139);

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for business-logos bucket
CREATE POLICY "Users can upload own workspace logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public read access to logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');

CREATE POLICY "Users can update own workspace logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own workspace logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM user_profiles WHERE user_id = auth.uid()
  )
);