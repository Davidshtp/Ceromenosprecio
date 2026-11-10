-- Add custom badge label for menu items
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS badge_label text;

-- Migrate previous featured flag into badge label, only if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'menu_items'
      AND column_name = 'is_featured'
  ) THEN
    UPDATE public.menu_items
    SET badge_label = 'Más vendida'
    WHERE is_featured = true
      AND (badge_label IS NULL OR btrim(badge_label) = '');
  END IF;
END $$;

