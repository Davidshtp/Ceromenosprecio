import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  status: "active" | "blocked" | "trial";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantSettings {
  id?: string;
  restaurant_id: string;
  display_name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color: string;
  secondary_color: string;
  phone?: string;
  whatsapp?: string;
  instagram_url?: string;
  address?: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  is_temporarily_closed: boolean;
  closed_message: string;
}

export interface RestaurantHours {
  id?: string;
  restaurant_id: string;
  day_of_week: number;
  is_open: boolean;
  opening_time?: string;
  closing_time?: string;
  second_opening_time?: string;
  second_closing_time?: string;
}

export interface RestaurantSession {
  id: string;
  email: string;
  role: "owner" | "staff";
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_is_active: boolean;
}

export interface MenuItemOption {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  product_images?: ProductImage[];
  ingredients?: string[];
  is_available: boolean;
  is_featured?: boolean;
  sizes?: MenuItemOption[];
  addons?: MenuItemOption[];
  display_order?: number;
  created_at: string;
}

export interface ProductImage {
  url: string;
  public_id?: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  order_type: "delivery" | "pickup" | "qr" | "counter" | "phone" | "table";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  total: number;
  status:
    | "pending"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "rejected";
  customer_notes?: string;
  payment_method?: "cash" | "transfer";
  cash_received?: number;
  change_due?: number;
  internal_notes?: string;
  preparing_at?: string;
  ready_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  base_price: number;
  selected_size?: MenuItemOption;
  selected_addons?: MenuItemOption[];
  item_total: number;
  special_instructions?: string;
}
