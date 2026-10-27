import React, { useEffect, useState } from "react";
import {
  useNavigate,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Settings,
} from "lucide-react";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";
import { supabase, type RestaurantSession } from "../../config/supabase";

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<RestaurantSession | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.rpc("restaurant_session");
      const sessionUser = (data?.[0] || null) as RestaurantSession | null;

      if (error || !sessionUser || !sessionUser.restaurant_is_active) {
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      if (mounted) {
        setUser(sessionUser);
        localStorage.setItem("user", JSON.stringify(sessionUser));
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: "Resumen" },
    { path: "/restaurant/orders", icon: ShoppingBag, label: "Pedidos" },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: "Menú" },
    { path: "/restaurant/reports", icon: FileText, label: "Reportes" },
    { path: "/restaurant/settings", icon: Settings, label: "Configuración" },
  ];

  return (
    <div className="dashboard-view min-h-screen bg-bg-subtle">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border bg-white/95 shadow-sm backdrop-blur">
        <div className="container-custom">
          <div className="flex h-[4rem] items-center justify-between sm:h-[4.5rem]">
            <div className="flex min-w-0 items-center space-x-2 sm:space-x-3">
              <img
                src="/assets/brand/cero-menosprecio-mascot.png"
                alt="Cero Menosprecio"
                className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
              />
              <div className="min-w-0">
                <h1 className="dashboard-brand truncate text-base text-text sm:text-xl">
                  Cero Menosprecio
                </h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-error/5 hover:text-error"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="border-b border-border bg-white">
        <div className="container-custom">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex shrink-0 items-center space-x-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs transition-colors sm:space-x-2 sm:px-4 sm:text-base ${
                    isActive
                      ? "border-accent bg-accent/[0.03] text-accent font-semibold"
                      : "border-transparent text-text-secondary hover:text-text"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom min-w-0 py-5 sm:py-8">
        <Routes>
          <Route index element={<RestaurantHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<RestaurantSettings />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
