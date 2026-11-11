import type { MenuItem } from "../config/supabase";

export type CatalogFilter = "all" | "food" | "drink";

export const getHeroMenuItems = (menuItems: MenuItem[]) => menuItems.filter((item) =>
  item.is_available && item.category_type !== "drink" &&
  (item.product_images?.some((image) => Boolean(image.url?.trim())) || Boolean(item.image_url?.trim()))
).sort((a, b) => Number(Boolean(b.badge_label?.trim())) - Number(Boolean(a.badge_label?.trim()))).slice(0, 5);

export const getHeroMenuItem = (menuItems: MenuItem[]) => getHeroMenuItems(menuItems)[0];

export const getCatalogSubcategories = (menuItems: MenuItem[], filter: CatalogFilter) => {
  if (filter === "all") return [];
  const categories = new Map<string, { id: string; name: string }>();
  for (const item of menuItems) {
    if (item.is_available && (item.category_type ?? "food") === filter && item.category_id && item.category_name) {
      categories.set(item.category_id, { id: item.category_id, name: item.category_name });
    }
  }
  return [...categories.values()];
};

export const getCatalogSections = (menuItems: MenuItem[], searchTerm = "", filter: CatalogFilter = "all", categoryId = "") => {
  const search = searchTerm.trim().toLocaleLowerCase("es");
  const items = menuItems.filter((item) => {
    const type = item.category_type ?? "food";
    return item.is_available && item.name.toLocaleLowerCase("es").includes(search) &&
      (filter === "all" || filter === type) &&
      (!categoryId || item.category_id === categoryId);
  }).sort((a, b) => Number(Boolean(b.badge_label?.trim())) - Number(Boolean(a.badge_label?.trim())));

  return {
    foodItems: items.filter((item) => item.category_type !== "drink"),
    drinkItems: items.filter((item) => item.category_type === "drink"),
  };
};
