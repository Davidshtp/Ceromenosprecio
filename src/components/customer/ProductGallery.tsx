import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize2, Package, X } from "lucide-react";
import type { ProductImage } from "../../config/supabase";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  const safeIndex = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
  const mainImage = images.length > 0 ? images[safeIndex] : null;

  const goTo = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      setActiveIndex((index + images.length) % images.length);
    },
    [images.length]
  );

  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);
  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    window.setTimeout(() => expandButtonRef.current?.focus(), 0);
  }, []);

  const handleOpenLightbox = useCallback(() => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    if (images.length === 0) return;
    setIsLightboxOpen(true);
  }, [images.length]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    didSwipe.current = false;
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (touchStartX.current === null || images.length < 2) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX.current;
      const delta = touchEndX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < 40) return;
      didSwipe.current = true;
      if (delta < 0) {
        setActiveIndex((index) => (index + 1) % images.length);
      } else {
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
      window.setTimeout(() => {
        didSwipe.current = false;
      }, 350);
    },
    [images.length]
  );

  useEffect(() => {
    if (!isLightboxOpen || images.length === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setIsLightboxOpen(false);
        window.setTimeout(() => expandButtonRef.current?.focus(), 0);
        return;
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % images.length);
      }
      if (event.key === "ArrowLeft" && images.length > 1) {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [images.length, isLightboxOpen]);

  if (!mainImage) {
    return (
      <div className="flex h-64 items-center justify-center bg-bg-subtle sm:h-72 lg:h-full">
        <Package className="h-12 w-12 text-text-secondary opacity-40" />
      </div>
    );
  }

  return (
    <div className="flex h-64 flex-col bg-bg-subtle sm:h-72 lg:h-full">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={handleOpenLightbox}
          className="group relative block h-full w-full cursor-zoom-in"
          aria-label={`Ampliar foto de ${productName}`}
        >
          <img
            src={mainImage.url}
            alt={`${productName} ${safeIndex + 1}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            loading="eager"
            decoding="async"
          />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <span
          className="absolute bottom-3 left-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
          aria-live="polite"
        >
          {safeIndex + 1} / {images.length}
        </span>

        <button
          ref={expandButtonRef}
          type="button"
          onClick={handleOpenLightbox}
          className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
          aria-label="Ampliar galería de fotos"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {images.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-black/5 bg-white/80 p-2">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                index === safeIndex
                  ? "border-accent"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${index + 1}`}
              aria-current={index === safeIndex ? "true" : undefined}
            >
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}

      {isLightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-3 text-white sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`Galería de fotos de ${productName}`}
            onClick={closeLightbox}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-4 pb-3"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="text-sm font-semibold">
                {safeIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeLightbox();
                }}
                className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
                aria-label="Cerrar galería"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center"
              onClick={(event) => event.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={mainImage.url}
                alt={`${productName} ${safeIndex + 1}`}
                className="max-h-full max-w-full object-contain"
                loading="eager"
                decoding="async"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      goPrev();
                    }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20 sm:left-2"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      goNext();
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20 sm:right-2"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div
                className="flex shrink-0 justify-center gap-2 overflow-x-auto pt-3"
                onClick={(event) => event.stopPropagation()}
              >
                {images.map((image, index) => (
                  <button
                    key={`${image.url}-lightbox-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      index === safeIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`Ver foto ${index + 1}`}
                    aria-current={index === safeIndex ? "true" : undefined}
                  >
                    <img
                      src={image.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
