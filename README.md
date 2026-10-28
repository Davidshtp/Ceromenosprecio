# Pedidos — Restaurant Ordering SaaS

<p align="center">
  <img src="public/assets/brand/brand-mark.png" alt="Brand mark" height="64" />
  <img src="public/assets/brand/mascota en blanco.png" alt="Mascota" height="64" />
</p>

Plataforma de pedidos para restaurantes: menú público para clientes (QR/móvil), panel de gestión de pedidos y menú para el restaurante, y mensajería por WhatsApp.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Realtime)
- Cloudinary (imágenes de productos)
- lucide-react (iconos)

## Requisitos

- Node.js 18+
- Cuenta de Supabase (proyecto con las tablas del esquema `database/Database.sql`)
- Cuenta de Cloudinary (cloud name + upload preset)

## Instalación

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

> **Cloudinary** no va en el `.env` del frontend. Las credenciales de Cloudinary (cloud name, upload preset, etc.) se configuran como **secrets en Supabase** (Edge Functions / configuración del proyecto), no en el cliente. El frontend usa valores por defecto definidos en `src/config/config.ts`.

## Scripts

```bash
npm run dev      # Servidor de desarrollo (http://localhost:5173)
npm run build    # Compilación de producción (tsc + vite)
npm run lint     # Lint (ESLint)
npm run preview  # Vista previa del build
```

## Estructura

```
src/
  pages/
    public/LoginPage.tsx          # Login del restaurante
    customer/CustomerMenu.tsx     # Menú público del cliente
    restaurant/                   # Dashboard, Menu, Orders, Reports, Settings
  components/
    customer/                     # ProductCard, ProductDetailModal, ProductGallery
    ui/                           # Button, Card, Input, Modal, Alert, ...
  services/restaurantService.ts   # Acceso a Supabase
  utils/                          # helpers, menuItem, whatsappMessages, location
  config/supabase.ts              # Cliente Supabase + tipos
database/Database.sql              # Esquema de referencia
```

## Funcionalidades principales

- **Menú público** (`/menu/:slug`): catálogo por categorías, filtros, detalle de producto con tamaños/adicionales, carrito, checkout.
- **Checkout**: tipo de pedido (domicilio/recoger), datos del cliente, método de pago (efectivo con monto y cambio / transferencia), instrucciones especiales, ubicación real (geolocalización + reverse geocoding gratuito con OpenStreetMap).
- **WhatsApp**: mensaje con el resumen del pedido (plantillas por contexto en `src/utils/whatsappMessages.ts`).
- **Panel del restaurante** (`/restaurant/*`): gestión del menú y categorías, pedidos en tiempo real, reportes, configuración y horarios.
- **Horarios y estado abierto/cerrado** en el menú público.
- **Método de pago** visible en las tarjetas y detalle de pedidos.

## Base de datos

El esquema de referencia está en `database/Database.sql`. La tabla `orders` incluye `payment_method`, `cash_received`, `change_due` y `delivery_latitude/longitude`. Hay un trigger `set_order_number` que genera el número de pedido; **no eliminar la tabla `restaurant_order_counters`**.

## ¿Qué resuelve?

- Restaurantes sin sistema de pedidos digital pueden recibir pedidos por QR/móvil sin instalar apps.
- Reduce errores de anotación manual y agiliza la preparación y entrega.
- Centraliza menú, pedidos, reportes y configuración en un solo lugar.
- Permite al cliente elegir método de pago (efectivo con cambio / transferencia) y compartir ubicación real.

## ¿Qué podemos hacer?

- Crear y gestionar menús con categorías, tamaños, adicionales e ingredientes.
- Recibir pedidos en tiempo real con notificación por WhatsApp.
- Aceptar pagos en efectivo (calculando cambio) o transferencia.
- Ver reportes de ventas y pedidos por periodo.
- Configurar horarios, estado abierto/cerrado y datos del restaurante.
- Personalizar el menú público con logo y colores.

## Licencia

Este proyecto está licenciado bajo la [Licencia MIT](https://opensource.org/licenses/MIT).

## Tecnologías y despliegue

- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime).
- **Imágenes**: Cloudinary (configurado como secrets en Supabase).
- **Despliegue**: Cloudflare Pages.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS.
