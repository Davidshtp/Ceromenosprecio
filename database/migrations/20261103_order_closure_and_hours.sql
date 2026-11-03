-- Run this migration against an existing Supabase database.
-- Verify duplicate hours before adding the unique constraint.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.restaurant_hours
    GROUP BY restaurant_id, day_of_week
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'No se puede crear la restricción de horarios: existen días duplicados por restaurante.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_hours_restaurant_day_unique'
      AND conrelid = 'public.restaurant_hours'::regclass
  ) THEN
    ALTER TABLE public.restaurant_hours
    ADD CONSTRAINT restaurant_hours_restaurant_day_unique
    UNIQUE (restaurant_id, day_of_week);
  END IF;
END $$;
