import React, { useState, useEffect } from "react";
import { Download, QrCode as QrCodeIcon, ExternalLink } from "lucide-react";
import {
  Card,
  Button,
  Loading,
  Alert,
  Textarea,
} from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type {
  Restaurant,
  RestaurantHours,
  RestaurantSettings as RestaurantSettingsData,
} from "../../config/supabase";
import {
  getRestaurantSettings,
  saveRestaurantSettings,
} from "../../services/restaurantService";

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
      } catch (err) {
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
      setError(result.error.message);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-1 text-2xl font-bold text-text">Configuración</h2>
        <p className="text-sm text-text-secondary">
        Administra el código QR, los horarios y las formas de atención.
        </p>
      </div>

      {/* QR Code Section */}
      <Card>
        <div className="flex items-start space-x-2 mb-4">
          <QrCodeIcon className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-lg font-bold text-text">Código QR del menú</h3>
            <p className="text-text-secondary text-sm">
              Tus clientes pueden escanearlo para abrir el menú digital.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <QRCodeSVG
                id="qr-code-svg"
                value={menuUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <Button
              icon={<Download className="w-5 h-5" />}
              onClick={downloadQRCode}
              fullWidth
            >
              Descargar código QR
            </Button>
          </div>

          {/* QR Code Info */}
          <div className="space-y-4">
            <div>
              <label className="label mb-2">Enlace del menú</label>
              <div className="p-3 bg-bg-subtle rounded-lg break-all text-text-secondary text-sm">
                {menuUrl}
              </div>
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-accent hover:text-accent-secondary mt-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir menú público</span>
              </a>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <h4 className="font-semibold text-text mb-2">Cómo usarlo:</h4>
              <ol className="space-y-2 text-text-secondary text-sm">
                <li>1. Descarga la imagen del código QR.</li>
                <li>2. Imprímela y ubícala en mesas, mostrador o entrada.</li>
                <li>3. Tus clientes la escanean con la cámara del celular.</li>
                <li>4. Accederán inmediatamente al menú actualizado.</li>
              </ol>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-success text-sm">
                ✓ El menú se actualiza automáticamente en tiempo real.
              </p>
              <p className="text-success text-sm">
                ✓ Tus clientes no necesitan instalar ninguna aplicación.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {settings && (
        <form onSubmit={saveSettings} className="space-y-6">
          <Card>
            <h3 className="mb-1 text-lg font-bold text-text">Formas de atención</h3>
            <p className="mb-4 text-sm text-text-secondary">
              Elige cómo pueden recibir los pedidos tus clientes.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-text">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.delivery_enabled}
                  onChange={(event) => setSettings({ ...settings, delivery_enabled: event.target.checked })} />
                Domicilios
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.pickup_enabled}
                  onChange={(event) => setSettings({ ...settings, pickup_enabled: event.target.checked })} />
                Recoger en el restaurante
              </label>
            </div>
          </Card>

          <Card>
            <h3 className="mb-1 text-lg font-bold text-text">Estado del menú</h3>
            <p className="mb-4 text-sm text-text-secondary">
              Puedes cerrar temporalmente el menú cuando no estés recibiendo pedidos.
            </p>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={settings.is_temporarily_closed}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    is_temporarily_closed: event.target.checked,
                  })
                }
              />
              Mostrar menú temporalmente cerrado
            </label>
            <Textarea
              label="Mensaje de cierre"
              value={settings.closed_message}
              onChange={(event) =>
                setSettings({ ...settings, closed_message: event.target.value })
              }
              rows={2}
            />
          </Card>

          <Card>
            <h3 className="mb-1 text-lg font-bold text-text">Horario de atención</h3>
            <p className="mb-4 text-sm text-text-secondary">Define cuándo recibes pedidos.</p>
            <div className="space-y-3">
              {hours.map((hour) => (
                <div
                  key={hour.day_of_week}
                  className="grid grid-cols-[1fr_auto_1fr_1fr] gap-3 items-center"
                >
                  <span className="text-sm font-medium text-text">
                    {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][hour.day_of_week]}
                  </span>
                  <input
                    type="checkbox"
                    checked={hour.is_open}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item) =>
                          item.day_of_week === hour.day_of_week
                            ? { ...item, is_open: event.target.checked }
                            : item
                        )
                      )
                    }
                  />
                  <input
                    type="time"
                    disabled={!hour.is_open}
                    value={hour.opening_time || ""}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item) =>
                          item.day_of_week === hour.day_of_week
                            ? { ...item, opening_time: event.target.value }
                            : item
                        )
                      )
                    }
                    className="input"
                  />
                  <input
                    type="time"
                    disabled={!hour.is_open}
                    value={hour.closing_time || ""}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item) =>
                          item.day_of_week === hour.day_of_week
                            ? { ...item, closing_time: event.target.value }
                            : item
                        )
                      )
                    }
                    className="input"
                  />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Guardar configuración
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RestaurantSettings;
