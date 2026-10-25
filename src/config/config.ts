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
  defaultCurrency: "$",
  orderPrefix: "ORD",

  // Subscription plans
  plans: {
    free_trial: {
      name: "Prueba gratuita",
      price: 0,
      duration: "14 días",
      features: [
        "Hasta 50 pedidos al mes",
        "Gestión básica del menú",
        "Pedidos por código QR",
        "Soporte por correo",
      ],
    },
    starter: {
      name: "Inicial",
      price: 299,
      duration: "al mes",
      features: [
        "Pedidos ilimitados",
        "Gestión completa del menú",
        "Pedidos por código QR",
        "Reportes",
        "Soporte por WhatsApp",
      ],
    },
    pro: {
      name: "Profesional",
      price: 599,
      duration: "al mes",
      features: [
        "Todo lo del plan Inicial",
        "Varias ubicaciones",
        "Analítica avanzada",
        "Marca personalizada",
        "Soporte prioritario",
      ],
    },
  },

  // Restaurant types
  restaurantTypes: [
    "Restaurante",
    "Camión de comida",
    "Cafetería",
    "Panadería",
    "Cocina oculta",
    "Alta cocina",
    "Comida rápida",
    "Otro",
  ],

  // Menu categories
  menuCategories: [
    "Entradas",
    "Platos fuertes",
    "Desayunos",
    "Almuerzos",
    "Cenas",
    "Bebidas",
    "Postres",
    "Pasabocas",
    "Otro",
  ],

  // Order statuses
  orderStatuses: {
    pending: { label: "Pendiente", color: "warning" },
    preparing: { label: "En preparación", color: "accent-secondary" },
    ready: { label: "Listo", color: "success" },
    completed: { label: "Entregado", color: "success" },
    cancelled: { label: "Cancelado", color: "error" },
    rejected: { label: "Rechazado", color: "error" },
  },

  // Payment methods
  paymentMethods: ["Efectivo", "Transferencia", "Tarjeta", "Otro"],

  // Registration sources
  heardFromOptions: [
    "Búsqueda en Google",
    "Redes sociales",
    "Amigo o referido",
    "Publicidad",
    "Otro",
  ],
};
