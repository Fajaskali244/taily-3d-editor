-- =========================================
-- Safe migration for 3D-printed minis spec
-- =========================================

-- 0) Pre-req: ensure generation_tasks table exists (minimal check).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'generation_tasks'
  ) THEN
    RAISE NOTICE 'Table public.generation_tasks does not exist. Create it before running this migration.';
  END IF;
END $$;

-- 1) Align designs table for 3D-printed minis spec
ALTER TABLE public.designs 
  ADD COLUMN IF NOT EXISTS chosen_glb_url TEXT,
  ADD COLUMN IF NOT EXISTS chosen_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS generation_task_id UUID
    REFERENCES public.generation_tasks(id) ON DELETE SET NULL;

-- 2) SAFE enum migration for public.order_status (no CASCADE, no data loss)
DO $$
DECLARE
  has_type   boolean;
  has_column boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_status' AND n.nspname = 'public'
  ) INTO has_type;

  IF has_type THEN
    -- Desired values live here:
    EXECUTE $create$
      CREATE TYPE public.order_status_new AS ENUM (
        'draft',
        'awaiting_generation',
        'generating',
        'pending_review',
        'approved_for_print',
        'printing',
        'fulfilled',
        'canceled'
      )
    $create$;

    -- Cast existing column if present
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status'
    ) INTO has_column;

    IF has_column THEN
      -- Drop default first to avoid type conflict during cast
      EXECUTE 'ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT';
      EXECUTE $cast$
        ALTER TABLE public.orders
        ALTER COLUMN status TYPE public.order_status_new
        USING status::text::public.order_status_new
      $cast$;
    END IF;

    -- Swap types
    EXECUTE 'DROP TYPE public.order_status';
    EXECUTE 'ALTER TYPE public.order_status_new RENAME TO order_status';

  ELSE
    -- No prior type: create desired one directly
    EXECUTE $create$
      CREATE TYPE public.order_status AS ENUM (
        'draft',
        'awaiting_generation',
        'generating',
        'pending_review',
        'approved_for_print',
        'printing',
        'fulfilled',
        'canceled'
      )
    $create$;
  END IF;
END $$;

-- 3) Ensure orders.status column exists and has default 'draft'
DO $$
DECLARE has_column boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status'
  ) INTO has_column;

  IF has_column THEN
    -- Column exists: restore default that may have been dropped during enum cast
    EXECUTE 'ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT ''draft''';
  ELSE
    -- Column missing: create with default
    EXECUTE 'ALTER TABLE public.orders ADD COLUMN status public.order_status DEFAULT ''draft''';
  END IF;
END $$;

-- 4) Print metadata for order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS print_file_url TEXT,
  ADD COLUMN IF NOT EXISTS print_meta JSONB DEFAULT '{}'::jsonb;

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_designs_generation_task_id ON public.designs(generation_task_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 6) Comments for clarity
COMMENT ON COLUMN public.designs.chosen_glb_url IS 'Final approved GLB file URL for printing';
COMMENT ON COLUMN public.designs.chosen_thumbnail_url IS 'Thumbnail of the approved model';
COMMENT ON COLUMN public.designs.generation_task_id IS 'Reference to the generation task that created this design';
COMMENT ON COLUMN public.order_items.print_file_url IS 'STL file URL ready for 3D printing';
COMMENT ON COLUMN public.order_items.print_meta IS 'Print settings: min_wall_mm, is_manifold, orientation, etc.';

-- 7) Backfill any null statuses
UPDATE public.orders SET status = 'draft' WHERE status IS NULL;

-- 8) Optional hardening once backfill is done
ALTER TABLE public.orders
  ALTER COLUMN status SET NOT NULL;

-- 9) Ask PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
