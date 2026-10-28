-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'trial'::text CHECK (status = ANY (ARRAY['active'::text, 'blocked'::text, 'trial'::text])),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'owner'::text CHECK (role = ANY (ARRAY['owner'::text, 'staff'::text, 'admin'::text])),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  auth_user_id uuid UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.menu_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT menu_categories_pkey PRIMARY KEY (id),
  CONSTRAINT menu_categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL CHECK (base_price >= 0::numeric),
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  sizes jsonb DEFAULT '[]'::jsonb,
  addons jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  order_number text NOT NULL,
  order_type text NOT NULL CHECK (order_type = ANY (ARRAY['delivery'::text, 'pickup'::text, 'qr'::text, 'counter'::text, 'phone'::text, 'table'::text])),
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text])),
  payment_method text,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])),
  payment_transaction_id text,
  cash_received numeric,
  change_due numeric,
  customer_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  delivery_address text,
  delivery_latitude double precision,
  delivery_longitude double precision,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.restaurant_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL UNIQUE,
  whatsapp text,
  address text,
  delivery_enabled boolean NOT NULL DEFAULT true,
  pickup_enabled boolean NOT NULL DEFAULT true,
  is_temporarily_closed boolean NOT NULL DEFAULT false,
  closed_message text NOT NULL DEFAULT 'We are currently closed. Please check our opening hours.'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  instagram_url text,
  CONSTRAINT restaurant_settings_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_settings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.restaurant_hours (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  opening_time time without time zone,
  closing_time time without time zone,
  CONSTRAINT restaurant_hours_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_hours_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.restaurant_order_counters (
  restaurant_id uuid NOT NULL,
  next_number bigint NOT NULL DEFAULT 0,
  CONSTRAINT restaurant_order_counters_pkey PRIMARY KEY (restaurant_id),
  CONSTRAINT restaurant_order_counters_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);