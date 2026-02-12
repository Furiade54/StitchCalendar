-- Make sure the storage bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('StitchCalendar', 'StitchCalendar', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist (to be safe)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create policies for StitchCalendar bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'StitchCalendar' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'StitchCalendar' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'StitchCalendar' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'StitchCalendar' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'StitchCalendar' AND auth.uid() = owner );
