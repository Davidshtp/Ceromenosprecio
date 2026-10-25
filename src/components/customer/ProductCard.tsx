import React, { useMemo } from "react";
import { Images, Minus, Package, Plus } from "lucide-react";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { getIngredientPreview, getMenuItemMinPrice, getProductImages } from "../../utils/menuItem";

interface ProductCardProps {
  item: MenuItem;
  quantity: number;
  restaurantIsOpen: boolean;
  onOpen: (item: MenuItem) => void;
  onAdd: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  quantity,
  restaurantIsOpen,
  onOpen,
  onAdd,
  onRemove,
}) => {
  const images = useMemo(() => getProductImages(item), [item]);
  const cover = images[0]?.url;
  const hasVariations = Boolean((item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0));
  const minPrice = getMenuItemMinPrice({ base_price: item.base_price, sizes: item.sizes });
  const ingredientPreview = getIngredientPreview(item.ingredients);
  const hasSizes = Boolean(item.sizes && item.sizes.length > 0);
  const canAdd = restaurantIsOpen && item.is_available;

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canAdd) return;
    if (hasVariations) {
      onOpen(item);
    } else {
      onAdd(item);
    }
  };

  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!restaurantIsOpen) return;
    onRemove(item);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(item);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={handleKeyDown}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
      aria-label={`Ver ${item.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-subtle">
        {cover ? (
          <img
            src={cover}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-secondary">
            <Package className="h-10 w-10 opacity-40" />
          </div>
        )}
        {images.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <Images className="h-3 w-3" />
            {images.length}
          </span>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded bg-black/80 px-2 py-1 text-xs text-white">No disponible</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {item.category_name && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {item.category_name}
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-bold text-text sm:text-base">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.description}</p>
        )}
        {ingredientPreview && (
          <p className="mt-2 line-clamp-1 text-[11px] text-text-secondary" title={item.ingredients?.join(", ")}>
            <span className="font-semibold text-text">Incluye:</span> {ingredientPreview}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {hasSizes && <p className="text-[10px] text-text-secondary">Desde</p>}
            <p className="text-base font-bold text-text">{formatCurrency(minPrice)}</p>
          </div>
          {item.is_available && (
            <div className="flex-shrink-0">
              {quantity === 0 ? (
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={handleAdd}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent px-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
                  aria-label={hasVariations ? `Elegir opciones de ${item.name}` : `Agregar ${item.name} al carrito`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Agregar</span>
                </button>
              ) : (
                <div className="flex items-center overflow-hidden rounded-xl bg-accent text-white">
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={!restaurantIsOpen}
                    className="p-2 transition-colors hover:bg-accent-hover disabled:opacity-50"
                    aria-label={`Quitar una unidad de ${item.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-6 px-1 text-center text-xs font-bold">{quantity}</span>
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={handleAdd}
                    className="p-2 transition-colors hover:bg-accent-hover disabled:opacity-50"
                    aria-label={hasVariations ? `Elegir opciones de ${item.name}` : `Agregar otra unidad de ${item.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
