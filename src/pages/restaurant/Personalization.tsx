import React, { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Card, Button, Input, Textarea, Loading, Alert, ImageUpload } from "../../components/ui";
import type { RestaurantSettings as RestaurantSettingsData } from "../../config/supabase";
import { getRestaurantSettings, saveRestaurantSettings } from "../../services/restaurantService";
import { normalizePhoneInput } from "../../utils/helpers";

const Personalization: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const restaurantId = JSON.parse(localStorage.getItem("user") || "{}").restaurant_id;
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    void getRestaurantSettings(restaurantId).then(({ settings: data }) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const result = await saveRestaurantSettings(settings, []);
    setSaving(false);
    setMessage(result.error ? "No se pudo guardar la personalización." : "Personalización guardada.");
  };

  if (loading) return <Loading text="Cargando personalización..." />;
  if (!settings) return <Alert type="error" message="No se pudo cargar la información del restaurante." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-text">Personalización</h2>
        <p className="text-sm text-text-secondary">
          Ajusta la información y apariencia que verán tus clientes.
        </p>
      </div>

      <form onSubmit={save}>
        <Card className="rounded-2xl">
          <div className="mb-5 flex items-center gap-2">
            <Palette className="h-5 w-5 text-accent" />
            <div>
              <h3 className="text-lg font-bold text-text">Información del restaurante</h3>
              <p className="text-sm text-text-secondary">Personaliza tu menú público.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre que verán tus clientes"
              value={settings.display_name}
              onChange={(event) => setSettings({ ...settings, display_name: event.target.value })}
              required
            />
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
            <Input
              label="WhatsApp del restaurante"
              value={settings.whatsapp || ""}
              onChange={(event) => setSettings({ ...settings, whatsapp: normalizePhoneInput(event.target.value) })}
              placeholder="3000000000"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
            />
            <Input
              label="Color principal"
              type="color"
              value={settings.primary_color}
              onChange={(event) => setSettings({ ...settings, primary_color: event.target.value })}
            />
            <Input
              label="Color secundario"
              type="color"
              value={settings.secondary_color}
              onChange={(event) => setSettings({ ...settings, secondary_color: event.target.value })}
            />
          </div>
          <Textarea
            label="Descripción"
            value={settings.description || ""}
            onChange={(event) => setSettings({ ...settings, description: event.target.value })}
            rows={2}
          />
          <Input
            label="Dirección del restaurante"
            value={settings.address || ""}
            onChange={(event) => setSettings({ ...settings, address: event.target.value })}
          />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {message && <p className="text-sm text-text-secondary">{message}</p>}
            <Button type="submit" loading={saving}>Guardar personalización</Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default Personalization;
