-- Migration for the single-restaurant digital menu.
-- Run this after database/setup.sql in the Supabase SQL Editor.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS product_images JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.menu_items
SET product_images = jsonb_build_array(
  jsonb_build_object('url', image_url)
)
WHERE image_url IS NOT NULL
  AND product_images = '[]'::jsonb;

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE RESTRICT;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS tax;

UPDATE public.orders
SET status = 'preparing'
WHERE status = 'accepted';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'));

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS accepted_at;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND LOWER(u.email) = LOWER(au.email);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('delivery', 'pickup', 'qr', 'counter', 'phone', 'table'));

CREATE TABLE IF NOT EXISTS public.restaurant_order_counters (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  next_number BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_sequence BIGINT;
BEGIN
  INSERT INTO public.restaurant_order_counters (restaurant_id, next_number)
  VALUES (NEW.restaurant_id, 1)
  ON CONFLICT (restaurant_id) DO UPDATE
    SET next_number = public.restaurant_order_counters.next_number + 1
  RETURNING next_number INTO order_sequence;

  NEW.order_number :=
    'CM-' ||
    LPAD(order_sequence::TEXT, 4, '0') ||
    '-' ||
    UPPER(SUBSTRING(MD5(COALESCE(NEW.id::TEXT, CLOCK_TIMESTAMP()::TEXT)), 1, 4));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#111827',
  secondary_color TEXT NOT NULL DEFAULT '#F59E0B',
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  pickup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_temporarily_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_message TEXT NOT NULL DEFAULT 'We are currently closed. Please check our opening hours.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurant_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  opening_time TIME,
  closing_time TIME,
  second_opening_time TIME,
  second_closing_time TIME,
  UNIQUE (restaurant_id, day_of_week)
);

CREATE OR REPLACE FUNCTION public.restaurant_session()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  restaurant_is_active BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.role,
    u.restaurant_id,
    r.name,
    r.slug,
    r.is_active
  FROM public.users u
  JOIN public.restaurants r ON r.id = u.restaurant_id
  WHERE u.auth_user_id = auth.uid()
    AND u.is_active = TRUE;
$$;

ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant users can manage their menu" ON public.menu_items;
CREATE POLICY "Restaurant users can manage their menu"
  ON public.menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = menu_items.restaurant_id
        AND u.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = menu_items.restaurant_id
        AND u.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant users can manage orders" ON public.orders;
CREATE POLICY "Restaurant users can manage orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = orders.restaurant_id
        AND u.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = orders.restaurant_id
        AND u.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Restaurant users can manage their categories" ON public.menu_categories;
CREATE POLICY "Restaurant users can manage their categories"
  ON public.menu_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = menu_categories.restaurant_id
        AND u.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = menu_categories.restaurant_id
        AND u.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Restaurant users can manage settings" ON public.restaurant_settings;
CREATE POLICY "Restaurant users can manage settings"
  ON public.restaurant_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = restaurant_settings.restaurant_id
        AND u.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = restaurant_settings.restaurant_id
        AND u.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Restaurant users can manage hours" ON public.restaurant_hours;
CREATE POLICY "Restaurant users can manage hours"
  ON public.restaurant_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = restaurant_hours.restaurant_id
        AND u.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.restaurant_id = restaurant_hours.restaurant_id
        AND u.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Public can view restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Public can view restaurant settings"
  ON public.restaurant_settings FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Public can view restaurant hours" ON public.restaurant_hours;
CREATE POLICY "Public can view restaurant hours"
  ON public.restaurant_hours FOR SELECT
  USING (TRUE);

GRANT EXECUTE ON FUNCTION public.restaurant_session TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view active menu categories" ON public.menu_categories;
CREATE POLICY "Public can view active menu categories"
  ON public.menu_categories FOR SELECT
  USING (is_active = TRUE);

ALTER TABLE public.restaurant_settings REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_hours REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'restaurant_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'restaurant_hours'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_hours;
  END IF;
END $$;
