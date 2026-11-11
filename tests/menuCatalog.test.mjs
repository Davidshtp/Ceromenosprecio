import { test } from "node:test";
import assert from "node:assert/strict";
import { getCatalogSections, getCatalogSubcategories, getHeroMenuItem, getHeroMenuItems } from "../src/utils/menuCatalog.ts";

const items = [
  { id: "drink", name: "Jugo de mango", category_id: "juices", category_type: "drink", category_name: "Jugos", is_available: true, badge_label: "Nuevo" },
  { id: "food", name: "Salchipapa", category_id: "specials", category_type: "food", category_name: "Especiales", is_available: true },
  { id: "legacy", name: "Hamburguesa", is_available: true },
  { id: "hidden", name: "Jugo de mora", category_type: "drink", category_name: "Jugos", is_available: false },
  { id: "featured", name: "Salchipapa familiar", category_type: "food", is_available: true, badge_label: "Favorita" },
];

test("hero only picks available food with a usable image, including legacy food", () => {
  const drink = { ...items[0], image_url: "drink.jpg" };
  const hiddenFood = { ...items[1], is_available: false, image_url: "hidden.jpg" };
  const food = { ...items[1], product_images: [{ url: "food.jpg" }] };
  assert.equal(getHeroMenuItem([drink, hiddenFood, items[1], food]), food);
  assert.equal(getHeroMenuItem([drink, hiddenFood]), undefined);
  assert.equal(getHeroMenuItem([]), undefined);
  const legacy = { ...items[2], image_url: "legacy.jpg" };
  assert.equal(getHeroMenuItem([legacy]), legacy);
});

test("separates drinks and keeps legacy items as food without changing source order", () => {
  const before = structuredClone(items);
  const sections = getCatalogSections(items);
  assert.deepEqual(sections.drinkItems.map((item) => item.id), ["drink"]);
  assert.deepEqual(sections.foodItems.map((item) => item.id), ["featured", "food", "legacy"]);
  assert.deepEqual(items, before);
});

test("hero rotation limits to five foods and prioritizes labeled dishes without mutating the menu", () => {
  const foods = Array.from({ length: 7 }, (_, index) => ({ ...items[1], id: `food-${index}`, image_url: "food.jpg", badge_label: index === 6 ? "Favorita" : null }));
  const before = structuredClone(foods);
  const selected = getHeroMenuItems([{ ...items[0], image_url: "drink.jpg" }, ...foods]);
  assert.equal(selected.length, 5);
  assert.equal(selected[0].id, "food-6");
  assert.ok(selected.every((item) => item.category_type === "food"));
  assert.deepEqual(foods, before);
});

test("type filters and category filters retain the correct section", () => {
  assert.equal(getCatalogSections(items, "", "food").drinkItems.length, 0);
  assert.equal(getCatalogSections(items, "", "drink").foodItems.length, 0);
  assert.deepEqual(getCatalogSections(items, "", "drink", "juices").drinkItems.map((item) => item.id), ["drink"]);
  assert.equal(getCatalogSections(items, "", "food", "specials").foodItems.length, 1);
  assert.deepEqual(getCatalogSections(items, "", "food", "juices"), { foodItems: [], drinkItems: [] });
});

test("search applies to both sections and never exposes unavailable items", () => {
  assert.equal(getCatalogSections(items, " MANGO ").drinkItems.length, 1);
  assert.equal(getCatalogSections(items, "salchipapa").foodItems.length, 2);
  assert.deepEqual(getCatalogSections(items, "mora"), { foodItems: [], drinkItems: [] });
  assert.deepEqual(getCatalogSections([]), { foodItems: [], drinkItems: [] });
});

test("reclassifying a category moves products without relying on its name", () => {
  const updated = items.map((item) => item.id === "food" ? { ...item, category_type: "drink" } : item);
  const sections = getCatalogSections(updated, "", "drink", "specials");
  assert.equal(sections.foodItems.length, 0);
  assert.equal(sections.drinkItems[0].id, "food");
});

test("subcategory lists belong only to the selected parent and include each category once", () => {
  const source = [...items, { ...items[0], id: "another-drink" }];
  assert.deepEqual(getCatalogSubcategories(source, "all"), []);
  assert.deepEqual(getCatalogSubcategories(source, "food"), [{ id: "specials", name: "Especiales" }]);
  assert.deepEqual(getCatalogSubcategories(source, "drink"), [{ id: "juices", name: "Jugos" }]);
});

test("identical subcategory names do not mix products or types", () => {
  const source = items.map((item) => item.category_id ? { ...item, category_name: "Especiales" } : item);
  assert.deepEqual(getCatalogSections(source, "", "drink", "juices").drinkItems.map((item) => item.id), ["drink"]);
  assert.equal(getCatalogSections(source, "", "drink", "specials").drinkItems.length, 0);
});
