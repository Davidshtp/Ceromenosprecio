import React from "react";
import { X } from "lucide-react";
import { useScrollLock } from "./useScrollLock";

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
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl",
  };

  const isBottom = position === "bottom";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden overscroll-none">
      <style>{`
        @keyframes modal-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-content-in { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .modal-backdrop-in { animation: modal-backdrop-in 0.2s ease-out; }
        .modal-content-in { animation: modal-content-in 0.25s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .modal-backdrop-in, .modal-content-in { animation: none; }
        }
      `}</style>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 modal-backdrop-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`flex h-full justify-center ${
          isBottom ? "items-end p-0 sm:items-center sm:p-4" : "items-center p-4"
        }`}
        onClick={onClose}
      >
        <div
          className={`relative flex max-h-[calc(100dvh-2rem)] w-full min-h-0 flex-col overflow-hidden ${sizes[size]} bg-white shadow-xl modal-content-in ${
            isBottom
              ? "max-h-[92dvh] rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl"
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
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
