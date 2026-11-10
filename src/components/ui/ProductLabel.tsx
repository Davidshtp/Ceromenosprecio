import { createElement } from "react";
import { BadgePercent, ChefHat, Clock, Flame, Heart, Leaf, PartyPopper, Tag, Trophy } from "lucide-react";

const getLabelIcon = (label: string) => {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\b(nuev[oa]s?|novedad(?:es)?|estreno|recien llegado[as]?)\b/.test(normalized)) return PartyPopper;
  if (/\b(mas vendid[oa]s?|popular(?:es)?|top|bestseller)\b/.test(normalized)) return Trophy;
  if (/\b(ofertas?|promocion(?:es)?|promo|descuentos?|2x1)\b/.test(normalized)) return BadgePercent;
  if (/\b(sin picante|no picante)\b/.test(normalized)) return Tag;
  if (/\b(picantes?|extra picante)\b/.test(normalized)) return Flame;
  if (/\b(vegan[oa]s?|vegetarian[oa]s?)\b/.test(normalized)) return Leaf;
  if (/\b(recomendad[oa]s?|chef|especialidad(?:es)?)\b/.test(normalized)) return ChefHat;
  if (/\b(favorit[oa]s?|preferid[oa]s?)\b/.test(normalized)) return Heart;
  if (/\b(limitad[oa]s?|temporada|solo hoy)\b/.test(normalized)) return Clock;
  return Tag;
};

interface ProductLabelProps {
  label?: string | null;
  compact?: boolean;
  className?: string;
}

export const ProductLabel = ({ label, compact = false, className = "" }: ProductLabelProps) => {
  const text = label?.trim();
  if (!text) return null;

  return (
    <span
      title={text}
      className={`inline-flex max-w-full items-center gap-2 border-2 border-black bg-yellow-400 py-1.5 pl-1.5 pr-3 text-black shadow-[3px_3px_0_0_#000] ${className}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-black text-yellow-400">
        {createElement(getLabelIcon(text), { "aria-hidden": true, className: "h-3.5 w-3.5" })}
      </span>
      <span className={`min-w-0 break-words text-[11px] font-black uppercase leading-snug tracking-wide sm:text-xs ${compact ? "line-clamp-2" : ""}`}>
        {text}
      </span>
    </span>
  );
};
