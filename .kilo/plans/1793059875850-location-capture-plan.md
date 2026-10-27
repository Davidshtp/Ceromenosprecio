# Plan: Captura de ubicación real del cliente (solución gratuita)

## Objetivo
Permitir al cliente, al elegir "Domicilio", usar la geolocalización del navegador para obtener sus coordenadas y una dirección legible, en lugar de escribir la dirección manualmente. Sin costos (sin Google Maps).

## Enfoque
- Usar `navigator.geolocation.getCurrentPosition` (gratis, nativo del navegador).
- Reverse geocoding con OpenStreetMap Nominatim (gratis, sin API key, límite ~1 req/s — suficiente para un flujo de checkout).
- Guardar `delivery_latitude` y `delivery_longitude` en la orden, además de la dirección textual (para compatibilidad y respaldo).
- Mantener el campo de texto manual como fallback si el usuario deniega permisos o falla la geolocalización.

## Cambios necesarios

### 1. Base de datos (migración SQL)
- Agregar columnas `delivery_latitude numeric`, `delivery_longitude numeric` a la tabla `orders`.
- (Opcional) índice por restaurante para futuras rutas.

### 2. Tipos (`src/config/supabase.ts`)
- Extender `Order` con `delivery_latitude?: number`, `delivery_longitude?: number`.

### 3. Nuevo util (`src/utils/location.ts`)
- `requestUserLocation(): Promise<{ lat, lng }>` envolviendo `getCurrentPosition` con promesa y timeout.
- `reverseGeocode(lat, lng): Promise<string>` llamando a `https://nominatim.openstreetmap.org/reverse?format=json&lat=...&lon=...` con header `Accept-Language: es` y `User-Agent` identificativo.
- `getUserAddress(): Promise<{ lat, lng, address }>` combinando ambos; lanza error descriptivo si se deniega permiso o falla.

### 4. CheckoutModal (`src/pages/customer/CustomerMenu.tsx`)
- Agregar estado `location` (lat/lng/address) y `locating` (boolean).
- Botón "Usar mi ubicación" junto al campo de dirección (solo en delivery).
- Al pulsar: solicitar permiso, mostrar spinner, rellenar `deliveryAddress` con la dirección obtenida y guardar coords.
- Si falla: mostrar toast/error y dejar el campo editable manualmente.
- Al enviar orden: incluir `delivery_latitude`/`delivery_longitude` si existen.
- Indicador visual de que la dirección vino de la ubicación (badge "Ubicación verificada").

### 5. Orders (vista restaurante) — opcional
- Mostrar enlace a Google Maps con las coords: `https://www.google.com/maps?q=lat,lng` (gratis, sin API) para que el restaurante vea la ubicación exacta.

## Riesgos y consideraciones
- Nominatim tiene límite de 1 req/s por IP; en checkout es aceptable, pero no abusar en listados.
- La geolocalización requiere HTTPS o localhost; en producción (dominio) funciona; en red local (http://192.168.x) el navegador puede bloquearla → fallback manual siempre disponible.
- Permiso denegado: el flujo manual debe seguir funcionando sin bloquear el pedido.
- Privacidad: pedir permiso explícito, no guardar ubicación sin consentimiento.

## Validación
- Build (`npm run build`) sin errores de tipos.
- Prueba en HTTPS/localhost: botón obtiene coords y rellena dirección.
- Prueba denegando permiso: campo manual sigue usable y el pedido se envía sin coords.
- Verificar que la orden se guarda con lat/lng en Supabase.

## Fuera de alcance
- Google Maps Places autocomplete.
- Ruteo/optimización de entregas.
- Mapa embebido en la app.
