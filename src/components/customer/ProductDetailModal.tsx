import React, { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Alert, Button, Modal } from "../ui";
import type { MenuItem, MenuItemOption } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { getMenuItemMinPrice, getProductImages } from "../../utils/menuItem";
import { ProductGallery } from "./ProductGallery";
import { ProductWeight } from "../ui/ProductWeight";
import { ProductLabel } from "../ui/ProductLabel";

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
        <div className="relative flex h-[88dvh] min-h-0 flex-col lg:grid lg:h-[min(760px,88vh)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] lg:grid-rows-[minmax(0,1fr)]" style={{ touchAction: 'pan-y' }}>
        <div className="relative shrink-0 lg:h-full" style={{ touchAction: 'pan-x pinch-zoom' }}>
          <ProductGallery images={images} productName={item.name} imageFit="contain" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 border-2 border-black bg-yellow-400 p-2 text-black shadow-[3px_3px_0_0_#000] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            aria-label="Cerrar detalle del producto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col border-t-4 border-black bg-white lg:h-full lg:border-l-4 lg:border-t-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
            <div className="flex flex-col gap-6 p-5 pb-6 sm:p-7 sm:pb-7">
              <div>
                <ProductLabel label={item.badge_label} className="mb-4" />
                {item.category_name && (
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                    {item.category_name}
                  </span>
                )}
                <h2 className="mt-2 break-words text-2xl font-black uppercase leading-tight tracking-tight text-black">{item.name}</h2>
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  {hasSizes && <span className="text-xs font-bold uppercase text-black/60">Desde</span>}
                  <span className="bg-yellow-400 px-3 py-1.5 text-xl font-black text-black">
                    {formatCurrency(hasSizes ? getMenuItemMinPrice(item) : item.base_price)}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-4 whitespace-pre-line break-words border-l-4 border-yellow-400 pl-3 text-sm leading-relaxed text-black/70">
                    {item.description}
                  </p>
                )}
                <ProductWeight weight={item.approximate_weight} className="mt-4" />
              </div>

              {!restaurantIsOpen && (
                <Alert
                  type="warning"
                  variant="brand"
                  title="Por ahora estamos cerrados"
                  message="Sigue explorando el menú y elige tu próximo antojo. Podrás agregarlo al carrito cuando abramos."
                />
              )}
              {!item.is_available && (
                <Alert type="error" variant="brand" title="Este antojo está en pausa" message="Este producto no está disponible por ahora. Explora el menú para encontrar otra opción." />
              )}

              {ingredients.length > 0 && (
                <section className="border-t-2 border-black/10 pt-5">
                  <h3 className="border-l-4 border-yellow-400 pl-2 text-sm font-black uppercase tracking-wide text-black">¿Qué incluye?</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {ingredients.map((ingredient, index) => (
                      <li
                        key={`${ingredient}-${index}`}
                        className="inline-flex max-w-full items-center gap-2 border border-black/15 bg-zinc-50 px-3 py-2 text-xs font-bold text-black"
                      >
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0 bg-yellow-400 text-black" />
                        <span className="min-w-0 break-words">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasSizes && item.sizes && (
                <section className="border-t-2 border-black/10 pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="border-l-4 border-yellow-400 pl-2 text-sm font-black uppercase tracking-wide text-black">Elige el tamaño</h3>
                    <span className="bg-black px-2 py-1 text-[9px] font-bold uppercase text-white">Obligatorio</span>
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
                          className={`flex items-center justify-between gap-3 rounded-none border-2 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                            isSelected
                              ? "border-black bg-yellow-400 shadow-[3px_3px_0_0_#000]"
                              : "border-black/20 bg-white hover:border-black hover:bg-yellow-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2 break-words text-sm font-bold text-black">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                isSelected ? "border-black bg-black" : "border-black/20"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <span className="min-w-0 break-words">{size.name}</span>
                          </span>
                          <span className="shrink-0 text-sm font-black text-black">{formatCurrency(size.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {addons.length > 0 && (
                <section className="border-t-2 border-black/10 pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="border-l-4 border-yellow-400 pl-2 text-sm font-black uppercase tracking-wide text-black">Adicionales</h3>
                    <span className="border border-black/20 px-2 py-1 text-[9px] font-bold uppercase text-black/60">Opcional</span>
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
                          className={`flex items-center justify-between gap-3 rounded-none border-2 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                            isSelected
                              ? "border-black bg-yellow-400 shadow-[3px_3px_0_0_#000]"
                              : "border-black/20 bg-white hover:border-black hover:bg-yellow-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-black">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                                isSelected ? "border-black bg-black" : "border-black/20"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <span className="min-w-0 break-words">{addon.name}</span>
                          </span>
                          <span className="shrink-0 text-sm font-black text-black">+{formatCurrency(addon.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t-2 border-black bg-zinc-50 px-4 py-4 sm:px-7 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center border-2 border-black bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  className="p-3 text-black transition-colors hover:bg-yellow-400 disabled:opacity-40"
                  aria-label="Quitar una unidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold text-black">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                  className="p-3 text-black transition-colors hover:bg-yellow-400"
                  aria-label="Agregar una unidad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Total</p>
                <p className="text-xl font-black text-black">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="mt-3">
              <Button
                fullWidth
                size="lg"
                className="rounded-none border-2 border-black font-black uppercase tracking-wide shadow-[3px_3px_0_0_#facc15] hover:bg-yellow-400 hover:text-black disabled:shadow-none"
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
