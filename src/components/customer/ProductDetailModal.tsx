import React, { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Alert, Button, Modal } from "../ui";
import type { MenuItem, MenuItemOption } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { getMenuItemMinPrice, getProductImages } from "../../utils/menuItem";
import { ProductGallery } from "./ProductGallery";

interface ProductDetailModalProps {
  item: MenuItem;
  isOpen: boolean;
  restaurantIsOpen: boolean;
  onClose: () => void;
  onAdd: (
    item: MenuItem,
    selectedSize: MenuItemOption | undefined,
    selectedAddons: MenuItemOption[],
    quantity: number
  ) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  isOpen,
  restaurantIsOpen,
  onClose,
  onAdd,
}) => {
  const [selectedSizeName, setSelectedSizeName] = useState<string | null>(
    item.sizes && item.sizes.length > 0 ? item.sizes[0].name : null
  );
  const [selectedAddonNames, setSelectedAddonNames] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const images = useMemo(() => getProductImages(item), [item]);

  const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
  const addons = Array.isArray(item.addons) ? item.addons : [];
  const ingredients = Array.isArray(item.ingredients) ? item.ingredients.filter(Boolean) : [];

  const selectedSize = hasSizes
    ? item.sizes!.find((size) => size.name === selectedSizeName) ?? item.sizes![0] ?? null
    : null;

  const selectedAddons = addons.filter((addon) => selectedAddonNames.includes(addon.name));

  const toggleAddon = (addon: MenuItemOption) => {
    setSelectedAddonNames((current) =>
      current.includes(addon.name)
        ? current.filter((name) => name !== addon.name)
        : [...current, addon.name]
    );
  };

  const unitPrice = (Number(selectedSize?.price) || Number(item.base_price) || 0) + selectedAddons.reduce((sum, addon) => sum + (Number(addon.price) || 0), 0);
  const total = unitPrice * quantity;

  const canAdd = restaurantIsOpen && item.is_available && quantity > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      position="bottom"
      size="xl"
      showCloseButton={false}
      contentClassName="p-0"
    >
      <div className="relative flex h-[88dvh] min-h-0 flex-col lg:grid lg:h-[min(760px,88vh)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="relative shrink-0 lg:h-full">
          <ProductGallery images={images} productName={item.name} />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-text shadow-md backdrop-blur transition-colors hover:bg-white"
            aria-label="Cerrar detalle del producto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:h-full">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 p-5 pb-6 sm:p-7 sm:pb-7">
              <div>
                {item.category_name && (
                  <span className="inline-flex rounded-full bg-bg-subtle px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    {item.category_name}
                  </span>
                )}
                <h2 className="mt-2 text-2xl font-bold text-text">{item.name}</h2>
                <div className="mt-2 flex items-baseline gap-2">
                  {hasSizes && <span className="text-xs text-text-secondary">Desde</span>}
                  <span className="text-xl font-bold text-text">
                    {formatCurrency(hasSizes ? getMenuItemMinPrice(item) : item.base_price)}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                    {item.description}
                  </p>
                )}
              </div>

              {!restaurantIsOpen && (
                <Alert
                  type="warning"
                  message="El restaurante está cerrado en este momento. Puedes ver el producto, pero no agregarlo al carrito."
                />
              )}
              {!item.is_available && (
                <Alert type="error" message="Este producto no está disponible por ahora." />
              )}

              {ingredients.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-text">¿Qué incluye?</h3>
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ingredients.map((ingredient, index) => (
                      <li
                        key={`${ingredient}-${index}`}
                        className="flex items-start gap-2 rounded-xl bg-bg-subtle px-3 py-2 text-sm text-text"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasSizes && item.sizes && (
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text">Elige el tamaño</h3>
                    <span className="text-xs text-text-secondary">Obligatorio</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {item.sizes.map((size) => {
                      const isSelected = selectedSize?.name === size.name;
                      return (
                        <button
                          key={size.name}
                          type="button"
                          onClick={() => setSelectedSizeName(size.name)}
                          aria-pressed={isSelected}
                          className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                            isSelected
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/40"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-text">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                isSelected ? "border-accent bg-accent" : "border-border"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </span>
                            {size.name}
                          </span>
                          <span className="font-semibold text-text">{formatCurrency(size.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {addons.length > 0 && (
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text">Adicionales</h3>
                    <span className="text-xs text-text-secondary">Opcional</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {addons.map((addon) => {
                      const isSelected = selectedAddonNames.includes(addon.name);
                      return (
                        <button
                          key={`${addon.name}-${addon.price}`}
                          type="button"
                          onClick={() => toggleAddon(addon)}
                          aria-pressed={isSelected}
                          className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                            isSelected
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/40"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-text">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                isSelected ? "border-accent bg-accent" : "border-border"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </span>
                            {addon.name}
                          </span>
                          <span className="font-semibold text-text">+{formatCurrency(addon.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t border-border bg-white px-4 py-4 sm:px-7 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  className="p-2 text-text-secondary transition-colors hover:text-text disabled:opacity-40"
                  aria-label="Quitar una unidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold text-text">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                  className="p-2 text-text-secondary transition-colors hover:text-text"
                  aria-label="Agregar una unidad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">Total</p>
                <p className="text-xl font-bold text-text">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="mt-3">
              <Button
                fullWidth
                size="lg"
                icon={<ShoppingBag className="h-4 w-4" />}
                disabled={!canAdd}
                onClick={() => onAdd(item, selectedSize ?? undefined, selectedAddons, quantity)}
              >
                {!item.is_available
                  ? "Producto no disponible"
                  : !restaurantIsOpen
                    ? "Restaurante cerrado"
                    : "Agregar al carrito"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
