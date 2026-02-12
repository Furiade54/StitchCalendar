-- ==============================================================================
-- FIX RLS POLICIES FOR STITCH CALENDAR
-- ==============================================================================
-- This script fixes visibility issues for Shared Calendars and hardens security.
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. EVENT TYPES VISIBILITY
-- Problem: Users could not see the "Color" or "Icon" of events shared with them
-- because they didn't have permission to view the owner's 'event_types'.
-- Fix: Allow all authenticated users to view event types (needed for shared views).

DROP POLICY IF EXISTS "Users can view own event types" ON event_types;
DROP POLICY IF EXISTS "Users can view all event types" ON event_types; -- Safety drop

CREATE POLICY "Users can view all event types" ON event_types 
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- 2. PROFILES SECURITY HARDENING
-- Problem: Profiles were viewable by "everyone" (public), allowing potential scraping.
-- Fix: Restrict profile visibility to only Authenticated users.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles; -- Safety drop

CREATE POLICY "Profiles are viewable by authenticated users" ON profiles 
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- 3. EVENTS VISIBILITY (Confirmation of existing logic)
-- Ensure the policy allows seeing events if you are an 'allowed_editor'.
-- This is already correct in the standard setup, but re-applying ensures consistency.

DROP POLICY IF EXISTS "Events viewable by authorized users" ON events;

CREATE POLICY "Events viewable by authorized users" ON events FOR SELECT USING (
  -- 1. Own events
  auth.uid() = user_id 
  -- 2. Explicitly shared with me
  OR auth.uid()::text = ANY(shared_with) 
  -- 3. Family shared events (if I am in the same family)
  OR ('family' = ANY(shared_with) AND EXISTS ( 
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.family_id = (SELECT family_id FROM profiles WHERE id = events.user_id)
      AND profiles.family_id IS NOT NULL
  ))
  -- 4. I am an allowed editor of the owner
  OR auth.uid() = ANY( 
      SELECT unnest(allowed_editors) FROM profiles WHERE id = events.user_id
  )
);
