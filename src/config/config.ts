// Supabase Configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dh2dq18lb";
export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "restaurant-menu";
export const CLOUDINARY_UPLOAD_FOLDER =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || "restaurant-menu";

// Application Configuration
export const APP_CONFIG = {
  appName: "Pedidos",
  orderPrefix: "ORD",

  // Order statuses
  orderStatuses: {
    pending: { label: "Pendiente", color: "warning" },
    preparing: { label: "En preparación", color: "accent-secondary" },
    ready: { label: "Listo", color: "success" },
    completed: { label: "Entregado", color: "success" },
    cancelled: { label: "Cancelado", color: "error" },
    rejected: { label: "Rechazado", color: "error" },
  },
};
