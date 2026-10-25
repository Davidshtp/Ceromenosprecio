import type { MenuItem, MenuItemOption, ProductImage } from "../config/supabase";

export const getProductImages = (
  item: Pick<MenuItem, "product_images" | "image_url">
): ProductImage[] => {
  const images: ProductImage[] = [];

  if (Array.isArray(item.product_images)) {
    for (const image of item.product_images) {
      if (!image || typeof image.url !== "string") continue;
      const url = image.url.trim();
      if (!url) continue;
      images.push({ ...image, url });
    }
  }

  if (typeof item.image_url === "string") {
    const url = item.image_url.trim();
    if (url) {
      images.push({ url });
    }
  }

  const seen = new Set<string>();
  return images.filter((image) => {
    const url = image.url.trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

export const getMenuItemMinPrice = (item: Pick<MenuItem, "sizes" | "base_price">): number => {
  const prices = Array.isArray(item.sizes)
    ? item.sizes
        .map((size) => Number(size?.price))
        .filter((price) => Number.isFinite(price))
    : [];

  if (prices.length > 0) {
    return Math.min(...prices);
  }

  const basePrice = Number(item.base_price);
  return Number.isFinite(basePrice) ? basePrice : 0;
};

export const getIngredientPreview = (ingredients: string[] | undefined, max = 3): string => {
  if (!Array.isArray(ingredients)) return "";

  const cleaned = ingredients
    .map((ingredient) => (typeof ingredient === "string" ? ingredient.trim() : ""))
    .filter(Boolean);

  if (cleaned.length === 0) return "";

  const visible = cleaned.slice(0, max);
  const remaining = cleaned.length - visible.length;

  if (remaining > 0) {
    return `${visible.join(" · ")} · +${remaining}`;
  }

  return visible.join(" · ");
};

export const getAddonsKey = (addons: MenuItemOption[] = []): string => {
  if (!Array.isArray(addons) || addons.length === 0) return "";
  return addons
    .map((addon) => `${typeof addon.name === "string" ? addon.name.trim() : ""}:${Number(addon.price)}`)
    .sort()
    .join("|");
};
