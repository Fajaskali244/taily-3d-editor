-- Secure the events_analytics table with proper RLS policies
-- This fixes the security issue where customer behavior data could be accessed by anyone

-- Enable Row Level Security on events_analytics table
ALTER TABLE public.events_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "events_analytics_user_data_only"
ON public.events_analytics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin can view all analytics
CREATE POLICY "events_analytics_admin_full_access"
ON public.events_analytics
FOR SELECT
TO authenticated
USING (
  COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
);

-- Service role can insert analytics
CREATE POLICY "events_analytics_service_insert"
ON public.events_analytics
FOR INSERT
TO service_role
WITH CHECK (true);

-- (Optional) Users can insert their own analytics
CREATE POLICY "events_analytics_user_insert_own"
ON public.events_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);