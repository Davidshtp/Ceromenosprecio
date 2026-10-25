import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Calendar,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Loading, Alert } from "../../components/ui";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  orderTypeDistribution: { type: string; count: number }[];
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: "Domicilio",
  pickup: "Recoger en tienda",
  qr: "QR / Mesa",
  counter: "Venta local",
  unknown: "Otro",
};

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.restaurant_id) {
        setError("No se encontró el restaurante.");
        setLoading(false);
        return;
      }

      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: orders, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", user.restaurant_id)
        .gte("created_at", startDate.toISOString())
        .in("status", ["completed", "ready", "preparing"]);

      if (fetchError) throw fetchError;

      const totalRevenue =
        orders?.reduce((sum, order) => sum + Number(order.total || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      orders?.forEach((order) => {
        (order.items || []).forEach((item: any) => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { count: 0, revenue: 0 };
          }
          itemCounts[item.name].count += Number(item.quantity || 0);
          itemCounts[item.name].revenue += Number(item.item_total || 0);
        });
      });

      const topItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Daily revenue
      const dailyData: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString("es-CO", {
          month: "short",
          day: "numeric",
        });
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, orders: 0 };
        }
        dailyData[date].revenue += Number(order.total || 0);
        dailyData[date].orders += 1;
      });

      const dailyRevenue = Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .slice(-14);

      // Order type distribution
      const typeCounts: Record<string, number> = {};
      orders?.forEach((order) => {
        const type = order.order_type || "unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const orderTypeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type: ORDER_TYPE_LABELS[type] || type,
        count,
      }));

      setReportData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        topItems,
        dailyRevenue,
        orderTypeDistribution,
      });
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("No se pudieron cargar los reportes.");
      toast.error("No se pudieron cargar los reportes.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ["Métrica", "Valor"],
      ["Ingresos totales", formatCurrency(reportData.totalRevenue)],
      ["Pedidos totales", reportData.totalOrders.toString()],
      ["Valor promedio del pedido", formatCurrency(reportData.avgOrderValue)],
      [""],
      ["Productos principales", "Cantidad", "Ingresos"],
      ...reportData.topItems.map((item) => [item.name, item.count.toString(), formatCurrency(item.revenue)]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${dateRange}-dias.csv`;
    a.click();
  };

  if (loading) {
    return <Loading text="Cargando reportes..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!reportData) {
    return (
      <div className="text-center text-text-secondary">No hay datos disponibles</div>
    );
  }

  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-accent" />
            <div>
              <h2 className="text-2xl font-bold text-text">Reportes y analítica</h2>
              <p className="text-sm text-text-secondary">
                Consulta el rendimiento y las tendencias de tus ventas
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as "7" | "30" | "90")}
              className="input w-auto"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
            <Button icon={<Download className="w-4 h-4" />} onClick={exportReport} variant="outline" size="sm">
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {formatCurrency(reportData.totalRevenue)}
          </div>
          <p className="text-text-secondary text-sm">Ingresos totales</p>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {reportData.totalOrders}
          </div>
          <p className="text-text-secondary text-sm">Pedidos totales</p>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent-secondary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-accent-secondary" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {formatCurrency(reportData.avgOrderValue)}
          </div>
          <p className="text-text-secondary text-sm">Valor promedio del pedido</p>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-warning/10 rounded-lg">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text mb-1">
            {dateRange} días
          </div>
          <p className="text-text-secondary text-sm">Periodo del reporte</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-bold text-text mb-4">Tendencia de ingresos</h3>
          {reportData.dailyRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-text-secondary">
              Sin datos para este periodo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  name="Ingresos"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-bold text-text mb-4">
            Distribución por tipo de pedido
          </h3>
          {reportData.orderTypeDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-text-secondary">
              Sin datos para este periodo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.orderTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.orderTypeDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top Items */}
      <Card className="rounded-2xl shadow-sm border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">Productos más vendidos</h3>
          <Package className="w-5 h-5 text-accent" />
        </div>

        {reportData.topItems.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            Aún no se han vendido productos
          </p>
        ) : (
          <div className="space-y-3">
            {reportData.topItems.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-text">{item.name}</div>
                    <div className="text-sm text-text-secondary">{item.count} pedidos</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-success">
                    {formatCurrency(item.revenue)}
                  </div>
                  <div className="text-xs text-text-secondary">Ingresos</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Daily Orders Chart */}
      <Card className="rounded-2xl shadow-sm border border-border">
        <h3 className="text-lg font-bold text-text mb-4">Pedidos diarios</h3>
        {reportData.dailyRevenue.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-text-secondary">
            Sin datos para este periodo
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="orders" fill="#4ECDC4" name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

export default Reports;