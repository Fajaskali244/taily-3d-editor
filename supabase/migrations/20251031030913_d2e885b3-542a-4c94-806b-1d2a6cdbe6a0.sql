-- Add columns to store requested generation settings
ALTER TABLE public.generation_tasks
  ADD COLUMN IF NOT EXISTS requested_polycount integer,
  ADD COLUMN IF NOT EXISTS requested_ai_model text,
  ADD COLUMN IF NOT EXISTS requested_should_remesh boolean,
  ADD COLUMN IF NOT EXISTS requested_should_texture boolean;

COMMENT ON COLUMN public.generation_tasks.requested_polycount IS 'Target polycount requested by user (draft/standard/high preset)';
COMMENT ON COLUMN public.generation_tasks.requested_ai_model IS 'AI model version requested';
COMMENT ON COLUMN public.generation_tasks.requested_should_remesh IS 'Whether remeshing was requested';
COMMENT ON COLUMN public.generation_tasks.requested_should_texture IS 'Whether texturing was requested';