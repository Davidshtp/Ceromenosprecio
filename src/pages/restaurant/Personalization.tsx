import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Image,
  MessageCircle,
  Palette,
  Search,
  Type,
} from "lucide-react";
import { Card, Button, Input, Textarea, Loading, ImageUpload } from "../../components/ui";
import type { RestaurantSettings as RestaurantSettingsData } from "../../config/supabase";
import { getRestaurantSettings, saveRestaurantSettings } from "../../services/restaurantService";

const Personalization: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const restaurantId = user.restaurant_id;
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    void getRestaurantSettings(restaurantId).then(({ settings: data }) => {
      if (data) {
        setSettings({
          ...data,
          display_name: data.display_name || user.restaurant?.name || "",
          primary_color: data.primary_color || "#000000",
          secondary_color: data.secondary_color || "#6366F1",
        });
      } else {
        setSettings({
          restaurant_id: restaurantId,
          display_name: user.restaurant?.name || "",
          logo_url: "",
          banner_url: "",
          description: "",
          address: "",
          whatsapp: "",
          phone: "",
          primary_color: "#000000",
          secondary_color: "#6366F1",
          delivery_enabled: true,
          pickup_enabled: true,
          is_temporarily_closed: false,
          closed_message: "",
        } as RestaurantSettingsData);
      }
      setLoading(false);
    });
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    const result = await saveRestaurantSettings(settings, []);
    setSaving(false);
    if (result.error) {
      toast.error("No se pudo guardar la personalización.");
      return;
    }
    toast.success("Personalización guardada correctamente.");
  };

  if (loading) return <Loading text="Cargando personalización..." />;
  if (!settings) {
    toast.error("No se pudo cargar la información del restaurante.");
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-text">Personalización</h2>
        <p className="text-sm text-text-secondary">
          Configura lo que verán tus clientes al escanear el código QR de tu menú.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Identidad */}
        <Card className="rounded-2xl">
          <div className="mb-6 flex items-center gap-2">
            <Type className="h-5 w-5 text-accent" />
            <div>
              <h3 className="text-lg font-bold text-text">Identidad del restaurante</h3>
              <p className="text-sm text-text-secondary">Nombre, logo, banner y descripción.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Nombre que verán tus clientes"
                value={settings.display_name || ""}
                onChange={(event) => setSettings({ ...settings, display_name: event.target.value })}
                placeholder="Ej. Cero Menosprecio"
                required
              />
            </div>
            <ImageUpload
              label="Logo del restaurante"
              value={settings.logo_url || ""}
              use="logo"
              onChange={(url) => setSettings({ ...settings, logo_url: url })}
            />
            <ImageUpload
              label="Banner del menú"
              value={settings.banner_url || ""}
              use="banner"
              onChange={(url) => setSettings({ ...settings, banner_url: url })}
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Descripción del restaurante"
              value={settings.description || ""}
              onChange={(event) => setSettings({ ...settings, description: event.target.value })}
              placeholder="Breve descripción que aparecerá en la parte superior del menú"
              rows={3}
            />
          </div>
        </Card>

        {/* Apariencia */}
        <Card className="rounded-2xl">
          <div className="mb-6 flex items-center gap-2">
            <Palette className="h-5 w-5 text-accent" />
            <div>
              <h3 className="text-lg font-bold text-text">Colores del menú</h3>
              <p className="text-sm text-text-secondary">Estos colores se aplicarán directamente al menú de tus clientes.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <Input
                label="Color principal"
                type="color"
                value={settings.primary_color || "#000000"}
                onChange={(event) => setSettings({ ...settings, primary_color: event.target.value })}
              />
              <p className="mt-2 text-xs text-text-secondary">Se usa en botones, carrito y acciones principales.</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <Input
                label="Color secundario"
                type="color"
                value={settings.secondary_color || "#6366F1"}
                onChange={(event) => setSettings({ ...settings, secondary_color: event.target.value })}
              />
              <p className="mt-2 text-xs text-text-secondary">Se usa para detalles y acentos del menú.</p>
            </div>
          </div>
        </Card>

        {/* Vista previa del menú QR */}
        <Card className="rounded-2xl shadow-lg border border-border">
          <div className="mb-6 flex items-center gap-2">
            <Image className="h-5 w-5 text-accent" />
            <div>
              <h3 className="text-lg font-bold text-text">Vista previa del menú</h3>
              <p className="text-sm text-text-secondary">
                Así se verá tu menú QR en tiempo real al guardar los cambios.
              </p>
            </div>
          </div>

          <MenuPreview settings={settings} />
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button type="submit" loading={saving} size="lg">
            Guardar personalización
          </Button>
        </div>
      </form>
    </div>
  );
};

const MenuPreview: React.FC<{ settings: RestaurantSettingsData }> = ({ settings }) => {
  const primaryColor = settings.primary_color || "#000000";
  const restaurantName = settings.display_name || "Nombre del restaurante";
  const restaurantLogo = settings.logo_url || "";
  const bannerUrl = settings.banner_url || "";
  const description = settings.description || "Descubre nuestros mejores platillos";
  const whatsapp = settings.whatsapp || "";

  const mockCategories = ["Todos", "Bebidas", "Comida", "Postres"];
  const mockItems = [
    {
      id: "prev-1",
      name: "Café Americano",
      description: "Café de especialidad recién hecho",
      price: 4500,
      category: "Bebidas",
      color: "#dbeafe",
    },
    {
      id: "prev-2",
      name: "Hamburguesa Clásica",
      description: "Con queso, lechuga y tomate",
      price: 12900,
      category: "Comida",
      color: "#fce7f3",
    },
    {
      id: "prev-3",
      name: "Torta de Chocolate",
      description: "Receta casera con cobertura",
      price: 6500,
      category: "Postres",
      color: "#fef3c7",
    },
    {
      id: "prev-4",
      name: "Jugo Natural",
      description: "Naranja o piña natural",
      price: 3500,
      category: "Bebidas",
      color: "#d1fae5",
    },
  ];

  const productPlaceholder = (name: string, color: string) => (
    <div
      className="flex h-full w-full items-center justify-center rounded-lg text-xs font-medium text-gray-500 overflow-hidden"
      style={{ backgroundColor: color }}
    >
      {name}
    </div>
  );

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border mb-4">
        {bannerUrl ? (
          <img src={bannerUrl} alt="Banner" className="w-full h-32 object-cover" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-[#f9fafb] text-sm text-gray-400">
            Sin banner configurado
          </div>
        )}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt="Logo"
              className="w-12 h-12 rounded-lg object-cover border border-black/10"
            />
          ) : (
            <div className="flex w-12 h-12 items-center justify-center rounded-lg bg-[#f9fafb] text-gray-400 text-xs font-medium">
              Logo
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-text leading-tight">{restaurantName}</h2>
            <p className="text-xs text-text-secondary truncate md:w-[340px]">
              {description}
            </p>
          </div>
        </div>
        {whatsapp && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-text-secondary bg-gray-50">
            <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
            WhatsApp configurado
          </span>
        )}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar platillos..."
          readOnly
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          style={{ borderColor: primaryColor }}
        />
      </div>

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto py-2 mb-4 scrollbar-hide">
        {mockCategories.map((category) => (
          <button
            key={category}
            disabled
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border border-gray-200 text-gray-600 bg-gray-50 ${
              category === "Todos"
                ? "bg-[#000000] text-white border-[#000000]"
                : ""
            }`}
            style={{
              backgroundColor:
                category === "Todos" ? primaryColor : "rgba(249, 250, 251, 1)",
              color: category === "Todos" ? "#ffffff" : "#6b7280",
              borderColor: category === "Todos" ? primaryColor : "rgba(0,0,0,0.1)",
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Productos */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {mockItems.map((item) => (
          <article
            key={item.id}
            className="flex flex-col overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f9fafb]">
              {productPlaceholder(item.name, item.color)}
            </div>
            <div className="flex flex-col p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {item.category}
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold text-text">{item.name}</h3>
              <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              <div className="mt-auto flex items-end justify-between pt-3">
                <div>
                  <p className="text-base font-bold text-text">
                    ${item.price.toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#f3f4f6] px-2.5 text-xs font-bold text-gray-500">
                  <span>Agregar</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Barra del carrito (solo dentro de la preview) */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#000000] text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex w-6 h-6 items-center justify-center rounded bg-white text-[#000000] font-bold text-xs"
              style={{ color: primaryColor }}
            >
              0
            </div>
            <span className="font-bold text-sm">$0</span>
          </div>
          <span className="text-xs font-medium">Ver carrito</span>
        </div>
      </div>
    </div>
  );
};

export default Personalization;
