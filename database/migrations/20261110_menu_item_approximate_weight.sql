-- Optional display weight, including its unit (for example: 250 g or 1,2 kg).
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS approximate_weight text;
