-- ================================
-- Harden 'designs' for My Designs
-- ================================

-- 0) Ensure RLS is on (policy is inert without this)
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- 1) Add missing columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='designs' AND column_name='generation_task_id'
  ) THEN
    ALTER TABLE public.designs
      ADD COLUMN generation_task_id uuid REFERENCES public.generation_tasks(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='designs' AND column_name='chosen_glb_url'
  ) THEN
    ALTER TABLE public.designs ADD COLUMN chosen_glb_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='designs' AND column_name='chosen_thumbnail_url'
  ) THEN
    ALTER TABLE public.designs ADD COLUMN chosen_thumbnail_url text;
  END IF;
END $$;

-- 2) Deduplicate by generation_task_id before adding unique index (keep newest)
WITH ranked AS (
  SELECT id, generation_task_id,
         row_number() OVER (
           PARTITION BY generation_task_id
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.designs
  WHERE generation_task_id IS NOT NULL
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.designs d
USING to_delete t
WHERE d.id = t.id;

-- 3) Unique index to support upsert (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='uq_designs_generation_task_id'
  ) THEN
    CREATE UNIQUE INDEX uq_designs_generation_task_id
      ON public.designs(generation_task_id);
  END IF;
END $$;

-- 4) Policies: owner read, admin read-all (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='designs' AND policyname='designs_select_own'
  ) THEN
    CREATE POLICY designs_select_own
    ON public.designs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='designs' AND policyname='designs_select_admin'
  ) THEN
    -- requires public.is_admin(uuid) (already used elsewhere)
    CREATE POLICY designs_select_admin
    ON public.designs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- 5) Refresh PostgREST so new cols/policies are visible
NOTIFY pgrst, 'reload schema';