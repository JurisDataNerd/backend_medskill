-- ============================================================
-- REMOVE SIMULATION SEGMENTS & ADD SIMULATION_PROGRESS TABLE
-- ============================================================

-- 1. Drop segment column from simulation_questions
ALTER TABLE public.simulation_questions 
DROP COLUMN IF EXISTS segment;

-- 2. Drop segment column from simulation_answers
ALTER TABLE public.simulation_answers 
DROP COLUMN IF EXISTS segment;

-- 3. Drop obsolete simulation_segment_progress table
DROP TABLE IF EXISTS public.simulation_segment_progress;

-- 4. Create simulation_progress table for real-time exam state (answers, flags, time, index)
CREATE TABLE IF NOT EXISTS public.simulation_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.simulation_sets(id) ON DELETE CASCADE,
  current_index INTEGER DEFAULT 0,
  answers JSONB DEFAULT '{}'::jsonb,
  flags JSONB DEFAULT '{}'::jsonb,
  remaining_time INTEGER NOT NULL DEFAULT 9000,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_simulation_progress_user_sim UNIQUE (user_id, simulation_id)
);

-- Index for fast lookup on simulation_progress
CREATE INDEX IF NOT EXISTS idx_simulation_progress_user_sim 
ON public.simulation_progress(user_id, simulation_id);

-- Enable RLS on simulation_progress
ALTER TABLE public.simulation_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own simulation_progress" ON public.simulation_progress;
CREATE POLICY "Users can manage own simulation_progress"
ON public.simulation_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable Service Role full access
DROP POLICY IF EXISTS "Service role full access to simulation_progress" ON public.simulation_progress;
CREATE POLICY "Service role full access to simulation_progress"
ON public.simulation_progress FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
