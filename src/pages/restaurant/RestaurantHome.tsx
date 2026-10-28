import React, { useCallback, useEffect, useState } from "react";
import { ShoppingBag, UtensilsCrossed, DollarSign, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, Badge, Loading } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import { formatCurrency } from "../../utils/helpers";

const RestaurantHome: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState<7 | 30>(7);

  const loadStats = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const data = await getRestaurantStats(user.restaurant_id);
    setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats();
  }, [loadStats]);

  if (loading) {
    return <Loading text="Cargando resumen..." />;
  }

  const statCards = [
    {
      title: "Pedidos pendientes",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pedidos de hoy",
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Ventas de hoy",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Productos del menú",
      value: stats?.totalMenuItems || 0,
      icon: UtensilsCrossed,
      color: "text-accent-secondary",
      bgColor: "bg-accent-secondary/10",
    },
  ];
  const sales = (stats?.dailySales || []).slice(-salesPeriod);
  const periodRevenue = sales.reduce(
    (total: number, day: { revenue: number }) => total + day.revenue,
    0
  );
  const maxDailyRevenue = Math.max(
    ...sales.map((day: { revenue: number }) => day.revenue),
    1
  );
  const formatDay = (date: string) =>
    new Intl.DateTimeFormat("es-CO", { weekday: "short" })
      .format(new Date(`${date}T12:00:00`))
      .replace(".", "");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
          Centro de control
        </p>
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-text">
          Resumen del restaurante
        </h2>
        <p className="text-sm text-text-secondary">
          Revisa tus pedidos, ventas y productos en un solo lugar.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="border-b border-border px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                Ventas
              </p>
              <p className="text-3xl font-bold tracking-tight text-text">
                {formatCurrency(periodRevenue)}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {sales.reduce(
                  (total: number, day: { orders: number }) => total + day.orders,
                  0
                )}{" "}
                pedidos completados en {salesPeriod} días
              </p>
            </div>
            <Link
              to="/restaurant/orders"
              className="text-xs font-semibold text-accent hover:underline"
            >
              Ver pedidos →
            </Link>
          </div>
          <div className="mt-5 flex items-end justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                Hoy
              </p>
              <p className="font-bold text-text">
                {formatCurrency(stats?.todayRevenue || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                Últimos 30 días
              </p>
              <p className="font-bold text-text">
                {formatCurrency(
                  (stats?.dailySales || []).reduce(
                    (total: number, day: { revenue: number }) =>
                      total + day.revenue,
                    0
                  )
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-5 sm:px-7">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
              Ventas por día
            </p>
            <div className="flex rounded-lg border border-border p-1 text-xs">
              {[7, 30].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSalesPeriod(period as 7 | 30)}
                  className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                    salesPeriod === period
                      ? "bg-accent text-white"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  {period} días
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-40 items-end gap-1.5 sm:gap-2">
            {sales.map(
              (day: { date: string; revenue: number; orders?: number }) => (
              <div
                key={day.date}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                title={`${day.orders || 0} ${
                  day.orders === 1 ? "pedido" : "pedidos"
                } · ${formatCurrency(day.revenue)} · ${day.date}`}
              >
                <span className="mb-1 min-h-3 text-[10px] font-semibold text-text">
                  {day.orders || 0}
                </span>
                <div
                  className="w-full max-w-7 rounded-t bg-accent/80 transition-all group-hover:bg-accent"
                  style={{
                    height: `${Math.max(
                      day.revenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 2,
                      2
                    )}%`,
                  }}
                />
                <span className="mt-2 text-[10px] text-text-secondary">
                  {salesPeriod === 7 || day.date === sales[0].date
                    ? formatDay(day.date)
                    : ""}
                </span>
              </div>
              )
            )}
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Pasa el cursor sobre las barras para consultar el detalle diario.
          </p>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <h3 className="mb-4 text-lg font-bold text-text">Acciones rápidas</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/restaurant/orders"
            className="rounded-xl border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent/5"
          >
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-semibold text-text">Ver pedidos</p>
            <p className="text-sm text-text-secondary">Gestiona los pedidos recibidos</p>
          </Link>
          <Link
            to="/restaurant/menu"
            className="rounded-xl border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent/5"
          >
            <UtensilsCrossed className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-semibold text-text">Administrar menú</p>
            <p className="text-sm text-text-secondary">Actualiza productos y precios</p>
          </Link>
          <Link
            to="/restaurant/reports"
            className="rounded-xl border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent/5"
          >
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-semibold text-text">Ver reportes</p>
            <p className="text-sm text-text-secondary">Consulta ventas y estadísticas</p>
          </Link>
        </div>
      </Card>

      {/* Recent Orders Preview */}
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text">Pedidos recientes</h3>
            <Link
              to="/restaurant/orders"
              className="text-accent hover:underline text-sm"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentOrders.slice(0, 5).map((order: { id: string; order_number?: number; customer_name?: string; total?: number; status?: string; order_type?: string; items?: unknown[] }) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    Pedido #{order.order_number}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {order.order_type === "delivery" ? "Domicilio" : "Recogida"} •{" "}
                    {order.items?.length || 0} productos
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text">
                    {formatCurrency(order.total)}
                  </p>
                  <Badge
                    variant={
                      order.status === "completed"
                        ? "success"
                        : order.status === "pending"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {order.status === "pending"
                      ? "Pendiente"
                      : order.status === "preparing"
                      ? "En preparación"
                      : order.status === "ready"
                      ? "Listo"
                      : order.status === "completed"
                      ? "Entregado"
                      : order.status === "cancelled"
                      ? "Cancelado"
                      : order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RestaurantHome;
