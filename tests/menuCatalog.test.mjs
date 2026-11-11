import { test } from "node:test";
import assert from "node:assert/strict";
import { getCatalogSections, getCatalogSubcategories } from "../src/utils/menuCatalog.ts";

const items = [
  { id: "drink", name: "Jugo de mango", category_id: "juices", category_type: "drink", category_name: "Jugos", is_available: true, badge_label: "Nuevo" },
  { id: "food", name: "Salchipapa", category_id: "specials", category_type: "food", category_name: "Especiales", is_available: true },
  { id: "legacy", name: "Hamburguesa", is_available: true },
  { id: "hidden", name: "Jugo de mora", category_type: "drink", category_name: "Jugos", is_available: false },
  { id: "featured", name: "Salchipapa familiar", category_type: "food", is_available: true, badge_label: "Favorita" },
];

test("separates drinks and keeps legacy items as food without changing source order", () => {
  const before = structuredClone(items);
  const sections = getCatalogSections(items);
  assert.deepEqual(sections.drinkItems.map((item) => item.id), ["drink"]);
  assert.deepEqual(sections.foodItems.map((item) => item.id), ["featured", "food", "legacy"]);
  assert.deepEqual(items, before);
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
