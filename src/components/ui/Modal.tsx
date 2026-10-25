import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  contentClassName?: string;
  position?: "center" | "bottom";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  contentClassName = "p-6",
  position = "center",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl",
  };

  const isBottom = position === "bottom";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`flex min-h-full justify-center ${
          isBottom ? "items-end p-0 sm:items-center sm:p-4" : "items-center p-4"
        }`}
        onClick={onClose}
      >
        <div
          className={`relative w-full ${sizes[size]} bg-white shadow-xl transition-all ${
            isBottom
              ? "flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl"
              : "rounded-lg"
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div
              className={`flex shrink-0 items-center justify-between gap-3 border-b border-border p-4 sm:p-6 ${
                isBottom ? "rounded-t-2xl sm:rounded-t-2xl" : ""
              }`}
            >
              {title && (
                <h2 className="min-w-0 break-words text-lg font-bold text-text sm:text-xl">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-text-secondary transition-colors hover:text-text"
                  aria-label="Cerrar"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div
            className={
              isBottom
                ? `min-h-0 flex-1 overflow-y-auto ${contentClassName}`
                : contentClassName
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
