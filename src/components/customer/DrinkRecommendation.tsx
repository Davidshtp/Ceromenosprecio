import { useState } from "react";
import { CupSoda, Plus } from "lucide-react";
import type { MenuItem, MenuItemOption } from "../../config/supabase";
import { getProductImages } from "../../utils/menuItem";
import { formatCurrency } from "../../utils/helpers";

interface DrinkRecommendationProps {
  drink: MenuItem;
  disabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (drink: MenuItem, size: MenuItemOption | undefined, addons: MenuItemOption[], quantity: number) => void;
}

export const DrinkRecommendation = ({ drink, disabled, expanded, onToggle, onAdd }: DrinkRecommendationProps) => {
  const [sizeName, setSizeName] = useState("");
  const [addonNames, setAddonNames] = useState<string[]>([]);
  const sizes = drink.sizes ?? [];
  const addons = drink.addons ?? [];
  const selectedSize = sizes.find((size) => size.name === sizeName) ?? sizes[0];
  const selectedAddons = addons.filter((addon) => addonNames.includes(addon.name));
  const price = Number(selectedSize?.price ?? drink.base_price) + selectedAddons.reduce((sum, addon) => sum + Number(addon.price), 0);
  const image = getProductImages(drink)[0];

  return (
    <div className={`min-w-0 bg-white transition-all duration-300 ease-out motion-reduce:transition-none ${expanded ? "col-span-3 border-2 border-black shadow-[4px_4px_0_0_#facc15]" : "border-2 border-black shadow-[2px_2px_0_0_#facc15] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#facc15]"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`drink-options-${drink.id}`}
        className={`flex w-full min-w-0 transition-all duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black motion-reduce:transition-none ${expanded ? "flex-row items-center gap-3 bg-yellow-400 p-2 text-left" : "flex-col bg-white text-center"}`}
      >
        <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-zinc-100 transition-all duration-300 ease-out motion-reduce:transition-none ${expanded ? "h-14 w-14 border-2 border-black" : "aspect-square w-full"}`}>
          {image ? <img src={image.url} alt={drink.name} loading="lazy" className="h-full w-full object-cover" /> : <CupSoda aria-hidden="true" className={`${expanded ? "h-6 w-6" : "h-8 w-8"} text-black/40`} />}
        </div>
        <p className={`min-w-0 font-black uppercase leading-tight ${expanded ? "flex-1 text-left text-xs text-black sm:text-sm" : "line-clamp-2 min-h-9 w-full bg-black px-1.5 py-2 text-[9px] text-white sm:text-[10px]"}`}>{drink.name}</p>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
        aria-hidden={!expanded}
        inert={!expanded}
      >
      <div className="min-h-0 overflow-hidden">
      <div id={`drink-options-${drink.id}`} className="border-t-2 border-black p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black/50">Precio seleccionado</span>
        <span className="bg-yellow-400 px-2 py-1 text-sm font-black text-black">{formatCurrency(price)}</span>
      </div>
      {sizes.length > 0 && (
        <fieldset className="mt-4 min-w-0" disabled={disabled || !expanded}>
          <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/55">
            Elige la presentación
          </legend>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            {sizes.map((size) => {
              const isSelected = selectedSize?.name === size.name;
              return (
                <button
                  key={size.name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSizeName(size.name)}
                  className={`flex min-h-12 min-w-0 items-center justify-between gap-2 border-2 px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected
                      ? "border-black bg-yellow-400 shadow-[3px_3px_0_0_#000]"
                      : "border-black/15 bg-white hover:border-black hover:bg-yellow-50"
                  }`}
                >
                  <span className="min-w-0 break-words text-xs font-black uppercase leading-tight text-black">
                    {size.name}
                  </span>
                  <span className="shrink-0 text-xs font-black text-black">
                    {formatCurrency(size.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {addons.length > 0 && (
        <details className="mt-3 text-xs text-black">
          <summary className="cursor-pointer py-2 font-bold">Adicionales opcionales</summary>
          {addons.map((addon) => (
            <label key={addon.name} className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 border border-black/15 px-3 py-2 font-bold hover:bg-yellow-50">
              <input type="checkbox" disabled={disabled || !expanded} checked={addonNames.includes(addon.name)} className="h-4 w-4 shrink-0 accent-black"
                onChange={(event) => setAddonNames((current) => event.target.checked ? [...current, addon.name] : current.filter((name) => name !== addon.name))} />
              <span className="min-w-0 break-words">{addon.name} · +{formatCurrency(addon.price)}</span>
            </label>
          ))}
        </details>
      )}
      <button type="button" disabled={disabled || !expanded || !drink.is_available}
        onClick={() => onAdd(drink, selectedSize, selectedAddons, 1)}
        aria-label={`Agregar ${drink.name} al carrito`}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 border-2 border-black bg-yellow-400 px-3 py-2 text-xs font-black text-black enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
        <Plus aria-hidden="true" className="h-4 w-4" /> Agregar bebida
      </button>
      </div>
      </div>
      </div>
    </div>
  );
};
