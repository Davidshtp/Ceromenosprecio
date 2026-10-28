import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { isValidEmail } from "../../utils/helpers";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.email || !formData.password) {
      toast.error("Completa tu correo electrónico y contraseña");
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: formData.email.toLowerCase(),
          password: formData.password,
        });

      if (authError || !authData.user) {
        toast.error(
          authError?.message === "Invalid login credentials"
            ? "El correo electrónico o la contraseña no son correctos"
            : authError?.message || "No fue posible iniciar sesión"
        );
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.rpc(
        "restaurant_session"
      );

      if (sessionError || !sessionData?.length) {
        await supabase.auth.signOut();
        toast.error(
          sessionError?.message ||
            "Tu cuenta no está vinculada a un restaurante"
        );
        return;
      }

      const userData = sessionData[0];

      // Check if restaurant is active
      if (!userData.restaurant_is_active) {
        toast.error(
          "La cuenta de tu restaurante está desactivada. Contacta al administrador."
        );
        setLoading(false);
        return;
      }

      // Login successful - store user data in localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userData.id,
          email: userData.email,
          restaurant_id: userData.restaurant_id,
          restaurant: {
            name: userData.restaurant_name,
            slug: userData.restaurant_slug,
            is_active: userData.restaurant_is_active,
          },
          temp_password: userData.temp_password,
        })
      );

      // Redirect to restaurant dashboard
      navigate("/restaurant");
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Ocurrió un error de conexión. Intenta nuevamente.";
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="login-view min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <Card className="px-6 py-8 sm:px-8">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <img
              src="/assets/brand/cero-menosprecio-logo.png"
              alt="Cero Menosprecio"
              className="mx-auto mb-1 w-full max-w-[280px] object-contain"
            />
            <p className="login-description text-text-secondary">
              Administra tu menú y tus pedidos desde un solo lugar
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@restaurante.com"
              icon={<Mail className="w-5 h-5" />}
              className="login-input"
              required
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña"
              icon={<Lock className="w-5 h-5" />}
              className="login-input"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              className="login-button"
            >
              Iniciar sesión
            </Button>
          </form>

        </Card>

        {/* Help Text */}
        <p className="login-help mt-6 text-center text-xs text-text-secondary">
          ¿Necesitas ayuda? Contacta al administrador del restaurante.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
