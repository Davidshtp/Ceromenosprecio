import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
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
              <p className="text-sm text-text-secondary">Nombre, logo y descripción.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Nombre que verán tus clientes"
                value={settings.display_name || ""}
                onChange={(event) => setSettings({ ...settings, display_name: event.target.value })}
                placeholder="Ej. Cero Menosprecio"
              />
            </div>
            <ImageUpload
              label="Logo del restaurante"
              value={settings.logo_url || ""}
              use="logo"
              onChange={(url) => setSettings({ ...settings, logo_url: url })}
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button type="submit" loading={saving} size="lg">
            Guardar personalización
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Personalization;