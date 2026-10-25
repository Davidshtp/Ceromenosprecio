import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  uploadImageToCloudinary,
  type CloudinaryImageUse,
} from "../../services/cloudinaryService";
import { Alert } from "./Alert";

interface ImageUploadProps {
  label: string;
  value?: string;
  use: CloudinaryImageUse;
  onChange: (url: string) => void;
  helperText?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  use,
  onChange,
  helperText,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 8 MB.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      onChange(await uploadImageToCloudinary(file, use));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la imagen."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="label">{label}</label>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={value}
            alt=""
            className={
              use === "banner"
                ? "h-40 w-full object-cover"
                : "h-40 w-full object-contain bg-bg-subtle"
            }
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-white p-1 text-error shadow"
            aria-label="Eliminar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
          ) : (
            <ImagePlus className="mb-2 h-8 w-8" />
          )}
          <span>{loading ? "Subiendo..." : "Elegir imagen"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {helperText && !error && (
        <p className="mt-1 text-sm text-text-secondary">{helperText}</p>
      )}
      {error && <Alert type="error" message={error} className="mt-2" />}
    </div>
  );
};
