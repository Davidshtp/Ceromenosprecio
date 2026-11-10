-- Add featured flag for menu items ("Más vendida" badge).
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
