-- Create enum types for generation tasks
CREATE TYPE public.generation_source AS ENUM ('image', 'text', 'multi-image');
CREATE TYPE public.generation_status AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'DELETED');

-- Create generation_tasks table
CREATE TABLE IF NOT EXISTS public.generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
  source public.generation_source NOT NULL,
  mode TEXT NOT NULL,
  prompt TEXT,
  input_image_urls TEXT[],
  meshy_task_id TEXT UNIQUE,
  status public.generation_status NOT NULL DEFAULT 'PENDING',
  progress INT DEFAULT 0,
  thumbnail_url TEXT,
  model_glb_url TEXT,
  model_fbx_url TEXT,
  model_usdz_url TEXT,
  texture_urls JSONB,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to manage their own tasks
CREATE POLICY generation_tasks_owner_all 
ON public.generation_tasks 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_generation_tasks_user_id ON public.generation_tasks(user_id);
CREATE INDEX idx_generation_tasks_status ON public.generation_tasks(status);
CREATE INDEX idx_generation_tasks_meshy_id ON public.generation_tasks(meshy_task_id);

-- Add comment
COMMENT ON TABLE public.generation_tasks IS 'Tracks 3D model generation tasks via Meshy API';
