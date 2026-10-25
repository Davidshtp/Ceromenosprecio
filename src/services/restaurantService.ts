import { supabase } from "../config/supabase";
import type {
  Order,
  MenuCategory,
  MenuItem,
  RestaurantHours,
  RestaurantSettings,
} from "../config/supabase";

/**
 * Restaurant API Service
 * All restaurant dashboard operations with real-time support
 */

// Subscribe to restaurant's orders with real-time updates
export const subscribeToOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void
) => {
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchOrders();

  const subscription = supabase
    .channel(`restaurant-orders-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  return subscription;
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: Order["status"],
  paymentData?: {
    paymentMethod?: string;
    transactionId?: string;
  }
) => {
  const updateData: Record<string, string | undefined> = { status };

  if (paymentData) {
    updateData.payment_method = paymentData.paymentMethod;
    updateData.payment_transaction_id = paymentData.transactionId;
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    console.error("Error updating order status:", error);
  }

  return !error;
};

// Subscribe to menu items with real-time updates
export const subscribeToMenuItems = (
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) => {
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*, menu_categories(name)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(
        (data || []).map((item) => ({
          ...item,
          category_name: item.menu_categories?.name,
          menu_categories: undefined,
        }))
      );
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-menu-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchItems();
      }
    )
    .subscribe();

  return subscription;
};

// Create menu item
export const createMenuItem = async (item: Partial<MenuItem>) => {
  const { data, error } = await supabase
    .from("menu_items")
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error("Error creating menu item:", error);
  }

  return { data, error };
};

// Update menu item
export const updateMenuItem = async (
  itemId: string,
  updates: Partial<MenuItem>
) => {
  const { error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating menu item:", error);
  }

  return !error;
};

export const getMenuCategories = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading menu categories:", error);
  }

  return { data: (data || []) as MenuCategory[], error };
};

export const getAvailableMenuItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, base_price, is_available")
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading available menu items:", error);
  }

  return { data: (data || []) as Pick<MenuItem, "id" | "name" | "base_price" | "is_available">[], error };
};

export const createMenuCategory = async (
  category: Pick<MenuCategory, "restaurant_id" | "name">
) => {
  const { data, error } = await supabase
    .from("menu_categories")
    .insert([{ ...category, display_order: 0, is_active: true }])
    .select()
    .single();

  if (error) {
    console.error("Error creating menu category:", error);
  }

  return { data: data as MenuCategory | null, error };
};

export const updateMenuCategory = async (categoryId: string, name: string) => {
  const { data, error } = await supabase
    .from("menu_categories")
    .update({ name: name.trim() })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) console.error("Error updating menu category:", error);
  return { data: data as MenuCategory | null, error };
};

export const deleteMenuCategory = async (categoryId: string) => {
  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (countError) {
    console.error("Error checking menu category products:", countError);
    return { error: countError };
  }

  if ((count || 0) > 0) {
    return {
      error: new Error(
        "No se puede eliminar una categoría que tiene productos asociados."
      ),
    };
  }

  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId);

  if (error) console.error("Error deleting menu category:", error);
  return { error };
};

export const getRestaurantSettings = async (restaurantId: string) => {
  const [{ data: settings, error: settingsError }, { data: hours, error: hoursError }] =
    await Promise.all([
      supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle(),
      supabase
        .from("restaurant_hours")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("day_of_week", { ascending: true }),
    ]);

  if (settingsError) console.error("Error loading restaurant settings:", settingsError);
  if (hoursError) console.error("Error loading restaurant hours:", hoursError);

  return {
    settings: settings as RestaurantSettings | null,
    hours: (hours || []) as RestaurantHours[],
    error: settingsError || hoursError,
  };
};

export const saveRestaurantSettings = async (
  settings: RestaurantSettings,
  hours: RestaurantHours[]
) => {
  const { data, error } = await supabase
    .from("restaurant_settings")
    .upsert(settings, { onConflict: "restaurant_id" })
    .select()
    .single();

  if (error) {
    console.error("Error saving restaurant settings:", error);
    return { data: null, error };
  }

  const { error: hoursError } = await supabase
    .from("restaurant_hours")
    .upsert(hours, { onConflict: "restaurant_id,day_of_week" });

  if (hoursError) console.error("Error saving restaurant hours:", hoursError);
  return { data: data as RestaurantSettings, error: hoursError };
};

// Toggle menu item availability (triggers real-time update for customers)
export const toggleMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean
) => {
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  return !error;
};

// Delete menu item
export const deleteMenuItem = async (itemId: string) => {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

  return !error;
};

// Create order (manual or from customer)
export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single();

  return { data, error };
};

// Get restaurant stats
export const getRestaurantStats = async (restaurantId: string) => {
  try {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const localDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;

    const [
      { data: todayOrders },
      { data: pendingOrders },
      { count: totalOrders },
      { count: totalMenuItems },
      { data: recentOrders },
      { data: salesOrders },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
      supabase
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
      supabase
        .from("orders")
        .select("id, order_number, order_type, items, total, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const completedToday = todayOrders?.filter((o) => o.status === "completed").length || 0;
    const revenueToday =
      todayOrders
        ?.filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;

    const dailySales = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + index);
      const dateKey = localDateKey(date);
      const dayOrders = (salesOrders || []).filter(
        (order) =>
          order.status === "completed" &&
          localDateKey(new Date(order.created_at)) === dateKey
      );

      return {
        date: dateKey,
        orders: dayOrders.length,
        revenue: dayOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        ),
      };
    });

    return {
      pendingOrders: pendingOrders?.length || 0,
      completedToday,
      revenueToday,
      totalOrders: totalOrders || 0,
      todayOrders: completedToday,
      todayRevenue: revenueToday,
      totalMenuItems: totalMenuItems || 0,
      recentOrders: recentOrders || [],
      dailySales,
    };
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    return {
      pendingOrders: 0,
      completedToday: 0,
      revenueToday: 0,
      totalOrders: 0,
      todayOrders: 0,
      todayRevenue: 0,
      totalMenuItems: 0,
      recentOrders: [],
      dailySales: [],
    };
  }
};
