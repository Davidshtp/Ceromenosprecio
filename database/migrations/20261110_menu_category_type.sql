-- Run before deploying the frontend. Existing categories remain food.
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'food'
  CHECK (type IN ('food', 'drink'));

-- Category edits must refresh the classification of subscribed menu items.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'menu_categories'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
  END IF;
END $$;
