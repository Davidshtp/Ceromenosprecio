import { Scale } from "lucide-react";

interface ProductWeightProps {
  weight?: string | null;
  className?: string;
}

export const ProductWeight = ({ weight, className = "" }: ProductWeightProps) => {
  const label = weight?.trim();
  if (!label) return null;

  return (
    <div className={`inline-flex max-w-full items-center gap-2 border-l-4 border-yellow-400 bg-black px-3 py-2 text-white ${className}`}>
      <Scale aria-hidden="true" className="h-4 w-4 shrink-0 text-yellow-400" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-yellow-400">Peso aprox.</p>
        <p className="break-words text-sm font-black leading-tight">{label}</p>
      </div>
    </div>
  );
};
