import React, { useState, useEffect } from "react";
import { Download, QrCode as QrCodeIcon, ExternalLink, Clock, Package, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Loading, Alert, Textarea, Input } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant, RestaurantHours, RestaurantSettings as RestaurantSettingsData } from "../../config/supabase";
import { getRestaurantSettings, saveRestaurantSettings } from "../../services/restaurantService";

const RestaurantSettings: React.FC = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RestaurantSettingsData | null>(null);
  const [hours, setHours] = useState<RestaurantHours[]>([]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.restaurant_id) {
          setError("No se encontró el restaurante.");
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", user.restaurant_id)
          .single();

        if (fetchError) throw fetchError;
        setRestaurant(data);

        const settingsData = await getRestaurantSettings(user.restaurant_id);
        setSettings(
          settingsData.settings || {
            restaurant_id: user.restaurant_id,
            display_name: data.name,
            description: "",
            whatsapp: "",
            instagram_url: "",
            primary_color: "#111827",
            secondary_color: "#F59E0B",
            delivery_enabled: true,
            pickup_enabled: true,
            is_temporarily_closed: false,
            closed_message: "En este momento estamos cerrados. Consulta nuestro horario.",
          }
        );
        setHours(
          settingsData.hours.length > 0
            ? settingsData.hours
            : Array.from({ length: 7 }, (_, day) => ({
                restaurant_id: user.restaurant_id,
                day_of_week: day,
                is_open: day !== 0,
                opening_time: "11:00",
                closing_time: "22:00",
              }))
        );
      } catch {
        setError("No se pudieron cargar los datos del restaurante.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, []);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError("");
    const result = await saveRestaurantSettings(settings, hours);
    setSaving(false);

    if (result.error) {
      toast.error("No se pudo guardar la configuración.");
      return;
    }
    toast.success("Configuración guardada correctamente.");
  };

  const downloadQRCode = () => {
    if (!restaurant) return;

    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${restaurant.slug}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return <Loading text="Cargando configuración..." />;
  }

  if (error || !restaurant) {
    return <Alert type="error" message={error || "No se encontró el restaurante."} />;
  }

  const menuUrl = `${window.location.origin}/menu/${restaurant.slug}`;
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-accent" />
          <div>
            <h2 className="text-2xl font-bold text-text">Configuración</h2>
            <p className="text-sm text-text-secondary">
              Administra el código QR, horarios, redes sociales y formas de atención.
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm border border-border">
        <div className="flex items-start gap-4 p-6">
          <QrCodeIcon className="w-6 h-6 text-accent mt-1" />
          <div>
            <h3 className="text-lg font-bold text-text">Código QR del menú</h3>
            <p className="text-sm text-text-secondary">
              Tus clientes pueden escanearlo para abrir el menú digital.
            </p>
          </div>
        </div>
        <div className="grid gap-6 p-6 pt-0 md:grid-cols-2">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <QRCodeSVG id="qr-code-svg" value={menuUrl} size={200} level="H" includeMargin={true} />
            </div>
            <Button icon={<Download className="w-4 h-4" />} onClick={downloadQRCode} fullWidth size="sm">
              Descargar código QR
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label mb-2">Enlace del menú</label>
              <div className="p-3 bg-bg-subtle rounded-lg break-all text-sm text-text-secondary border border-border">
                {menuUrl}
              </div>
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-secondary mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir menú público
              </a>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success">
              <p>✓ El menú se actualiza automáticamente en tiempo real.</p>
              <p>✓ Tus clientes no necesitan instalar ninguna aplicación.</p>
            </div>
          </div>
        </div>
      </Card>

      {settings && (
        <form onSubmit={saveSettings} className="space-y-6">
          <Card className="rounded-2xl shadow-sm border border-border">
            <div className="flex items-start gap-4 p-6">
              <Clock className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="text-lg font-bold text-text">Formas de atención</h3>
                <p className="text-sm text-text-secondary">Elige cómo pueden recibir los pedidos tus clientes.</p>
              </div>
            </div>
            <div className="grid gap-3 p-6 pt-0 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-bg-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.delivery_enabled}
                  onChange={(e) =>
                    setSettings({ ...(settings as RestaurantSettingsData), delivery_enabled: e.target.checked })
                  }
                  className="h-5 w-5 rounded text-primary"
                />
                <div>
                  <span className="block font-medium text-text">Domicilios</span>
                  <span className="text-xs text-text-secondary">Recibe pedidos a domicilio</span>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-bg-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pickup_enabled}
                  onChange={(e) =>
                    setSettings({ ...(settings as RestaurantSettingsData), pickup_enabled: e.target.checked })
                  }
                  className="h-5 w-5 rounded text-primary"
                />
                <div>
                  <span className="block font-medium text-text">Recoger en tienda</span>
                  <span className="text-xs text-text-secondary">Tus clientes recogen en el restaurante</span>
                </div>
              </label>
            </div>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-border">
            <div className="flex items-start gap-4 p-6">
              <MessageCircle className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="text-lg font-bold text-text">Redes sociales</h3>
                <p className="text-sm text-text-secondary">Aparecerán en el menú de tus clientes.</p>
              </div>
            </div>
            <div className="grid gap-4 p-6 pt-0 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">WhatsApp</label>
                <Input
                  value={settings.whatsapp || ""}
                  onChange={(e) => setSettings({ ...(settings as RestaurantSettingsData), whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  placeholder="3000000000"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Instagram</label>
                <Input
                  value={settings.instagram_url || ""}
                  onChange={(e) => setSettings({ ...(settings as RestaurantSettingsData), instagram_url: e.target.value })}
                  placeholder="https://instagram.com/tu_restaurante"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-text">Dirección del restaurante</label>
                <Input
                  value={settings.address || ""}
                  onChange={(e) => setSettings({ ...(settings as RestaurantSettingsData), address: e.target.value })}
                  placeholder="Calle, número, barrio..."
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-border">
            <div className="flex items-start gap-4 p-6">
              <Package className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="text-lg font-bold text-text">Estado del menú</h3>
                <p className="text-sm text-text-secondary">Cierra temporalmente cuando no estés recibiendo pedidos.</p>
              </div>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-bg-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_temporarily_closed}
                  onChange={(e) => setSettings({ ...(settings as RestaurantSettingsData), is_temporarily_closed: e.target.checked })}
                  className="h-5 w-5 rounded text-primary"
                />
                <div>
                  <span className="block font-medium text-text">Mostrar menú temporalmente cerrado</span>
                  <span className="text-xs text-text-secondary">Los clientes verán un aviso de cerrado</span>
                </div>
              </label>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Mensaje de cierre</label>
                <Textarea
                  value={settings.closed_message || ""}
                  onChange={(e) => setSettings({ ...(settings as RestaurantSettingsData), closed_message: e.target.value })}
                  placeholder="Estamos cerrados, vuelve pronto."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-border">
            <div className="flex items-start gap-4 p-6">
              <Clock className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="text-lg font-bold text-text">Horario de atención</h3>
                <p className="text-sm text-text-secondary">Define cuándo recibes pedidos.</p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Día</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Abierto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Apertura</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {hours.map((hour) => {
                      const dayName = days[hour.day_of_week];
                      return (
                        <tr key={hour.day_of_week}>
                          <td className="px-4 py-3 text-sm font-medium text-text">{dayName}</td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={hour.is_open}
                              onChange={(e) =>
                                setHours((current) =>
                                  current.map((item) =>
                                    item.day_of_week === hour.day_of_week ? { ...item, is_open: e.target.checked } : item
                                  )
                                )
                              }
                              className="h-4 w-4 rounded text-primary"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              disabled={!hour.is_open}
                              value={hour.opening_time || ""}
                              onChange={(e) =>
                                setHours((current) =>
                                  current.map((item) =>
                                    item.day_of_week === hour.day_of_week ? { ...item, opening_time: e.target.value } : item
                                  )
                                )
                              }
                              className="input w-full disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              disabled={!hour.is_open}
                              value={hour.closing_time || ""}
                              onChange={(e) =>
                                setHours((current) =>
                                  current.map((item) =>
                                    item.day_of_week === hour.day_of_week ? { ...item, closing_time: e.target.value } : item
                                  )
                                )
                              }
                              className="input w-full disabled:opacity-50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={saving} size="lg">
              Guardar configuración
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RestaurantSettings;