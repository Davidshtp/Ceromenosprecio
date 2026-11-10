import React from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  variant?: "default" | "brand";
}

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  message,
  onClose,
  className = "",
  variant = "default",
}) => {
  const styles = {
    success: {
      bg: "bg-success/10",
      border: "border-success",
      text: "text-success",
      icon: CheckCircle,
    },
    error: {
      bg: "bg-error/10",
      border: "border-error",
      text: "text-error",
      icon: AlertCircle,
    },
    warning: {
      bg: "bg-warning/10",
      border: "border-warning",
      text: "text-warning",
      icon: AlertCircle,
    },
    info: {
      bg: "bg-accent-secondary/10",
      border: "border-accent-secondary",
      text: "text-accent-secondary",
      icon: Info,
    },
  };

  const config = styles[type];
  const Icon = config.icon;

  if (variant === "brand") {
    return (
      <div role="status" className={`border-2 border-black bg-yellow-50 p-4 shadow-[4px_4px_0_0_#facc15] ${className}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-yellow-400 text-black">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            {title && <h4 className="mb-1 text-sm font-black uppercase tracking-wide text-black">{title}</h4>}
            <p className="text-sm leading-relaxed text-black/75">{message}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="p-1 text-black hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${config.bg} border-l-4 ${config.border} p-4 rounded ${className}`}
    >
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${config.text} mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold ${config.text} mb-1`}>{title}</h4>
          )}
          <p className="text-sm text-text">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 text-text-secondary hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
