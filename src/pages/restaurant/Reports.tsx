import React, { useCallback, useState, useEffect } from "react";
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
import { supabase } from "../../config/supabase";
import { formatCurrency, getStoredRestaurantId } from "../../utils/helpers";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  orderTypeDistribution: { type: string; count: number }[];
}

interface ReportOrderItem {
  name?: string;
  quantity?: number;
  item_total?: number;
}

interface ReportOrder {
  total?: number;
  status: string;
  order_type?: string;
  items?: ReportOrderItem[] | string;
  created_at: string;
}

const getBogotaDate = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const getReportDateRange = (
  days: number
): { start: string; startKey: string; end: string; endKey: string } => {
  const now = new Date();
  const bogotaToday = getBogotaDate(now);
  const [year, month, day] = bogotaToday.split("-").map(Number);
  const endKeyDate = new Date(Date.UTC(year, month - 1, day + 1, 5));
  const startKeyDate = new Date(Date.UTC(year, month - 1, day - (days - 1), 5));
  const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
  const endKey = toDateKey(endKeyDate);
  const startKey = toDateKey(startKeyDate);

  return {
    start: startKeyDate.toISOString(),
    startKey,
    end: endKeyDate.toISOString(),
    endKey,
  };

};

const CHART_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

const chartAxisColor = "#475569";
const chartGridColor = "#cbd5e1";

const LineReportChart: React.FC<{ data: ReportData["dailyRevenue"] }> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 720;
  const height = 300;
  const padding = { top: 24, right: 24, bottom: 42, left: 66 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((item) => item.revenue), 1);
  const getX = (index: number) =>
    padding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const getY = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;
  const points = data.map((item, index) => `${getX(index)},${getY(item.revenue)}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + plotHeight} ${points} ${padding.left + plotWidth},${padding.top + plotHeight}`;
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full rounded-xl bg-slate-50" role="img" aria-label="Tendencia de ingresos">
      <defs>
        <linearGradient id="revenue-area-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#DC2626" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + plotHeight * ratio;
        return (
          <g key={ratio}>
            <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke={chartGridColor} strokeDasharray="5 5" />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill={chartAxisColor}>
              {formatCurrency(Math.round(max * (1 - ratio)))}
            </text>
          </g>
        );
      })}
      <polygon points={areaPoints} fill="url(#revenue-area-gradient)" />
      <polyline points={points} fill="none" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((item, index) => (
        <g key={`${item.date}-${index}`}>
          <circle
            cx={getX(index)}
            cy={getY(item.revenue)}
            r={activeIndex === index ? 8 : 5}
            fill="#DC2626"
            stroke="#fff"
            strokeWidth={activeIndex === index ? 3 : 2}
            className="cursor-pointer"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
          </circle>
          {activeIndex === index && (
            <g pointerEvents="none">
              <rect x={Math.min(Math.max(getX(index) - 78, 4), width - 162)} y="6" width="158" height="42" rx="8" fill="#111827" />
              <text x={Math.min(Math.max(getX(index), 83), width - 83)} y="23" textAnchor="middle" fontSize="11" fill="#fff">
                {item.date} · {formatCurrency(item.revenue)}
              </text>
              <text x={Math.min(Math.max(getX(index), 83), width - 83)} y="39" textAnchor="middle" fontSize="10" fill="#d1d5db">
                {item.orders} {item.orders === 1 ? "pedido" : "pedidos"}
              </text>
            </g>
          )}
          {(index % labelStep === 0 || index === data.length - 1) && (
            <text x={getX(index)} y={height - 13} textAnchor="middle" fontSize="11" fill={chartAxisColor}>
              {item.date}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

const BarReportChart: React.FC<{ data: ReportData["dailyRevenue"] }> = ({ data }) => {
  const width = 720;
  const height = 300;
  const padding = { top: 24, right: 20, bottom: 42, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((item) => item.orders), 1);
  const slot = plotWidth / data.length;
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full rounded-xl bg-slate-50" role="img" aria-label="Pedidos diarios">
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + plotHeight * ratio;
        return (
          <g key={ratio}>
            <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke={chartGridColor} strokeDasharray="5 5" />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill={chartAxisColor}>
              {Math.round(max * (1 - ratio))}
            </text>
          </g>
        );
      })}
      {data.map((item, index) => {
        const barHeight = Math.max((item.orders / max) * plotHeight, 4);
        const x = padding.left + index * slot + slot * 0.16;
        return (
          <g key={`${item.date}-${index}`}>
            <rect
              x={x}
              y={padding.top + plotHeight - barHeight}
              width={Math.max(slot * 0.68, 3)}
              height={barHeight}
              rx="5"
              fill="#0F766E"
              className="cursor-pointer transition-opacity hover:opacity-70"
            >
              <title>{`${item.date}: ${item.orders} ${item.orders === 1 ? "pedido" : "pedidos"} · ${formatCurrency(item.revenue)}`}</title>
            </rect>
            {item.orders > 0 && (
              <text x={x + Math.max(slot * 0.68, 3) / 2} y={padding.top + plotHeight - barHeight - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0F766E">
                {item.orders}
              </text>
            )}
            {(index % labelStep === 0 || index === data.length - 1) && (
              <text x={x + Math.max(slot * 0.68, 3) / 2} y={height - 13} textAnchor="middle" fontSize="11" fill={chartAxisColor}>
                {item.date}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const OrderTypeDonut: React.FC<{
  data: ReportData["orderTypeDistribution"];
}> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-52 w-52">
      <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Distribución por tipo de pedido">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        {data.map((entry, index) => {
          const offset = data
            .slice(0, index)
            .reduce((sum, item) => sum + (item.count / total) * circumference, 0);
          const length = (entry.count / total) * circumference;
          return (
            <circle
              key={entry.type}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={activeIndex === index ? 20 : 16}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <title>{`${entry.type}: ${entry.count} ${entry.count === 1 ? "pedido" : "pedidos"} (${((entry.count / total) * 100).toFixed(0)}%)`}</title>
            </circle>
          );
        })}
        <text x="50" y="48" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0f172a">
          {activeIndex === null ? total : data[activeIndex].count}
        </text>
        <text x="50" y="58" textAnchor="middle" fontSize="5" fill="#64748b">
          {activeIndex === null ? "pedidos" : data[activeIndex].type}
        </text>
      </svg>
    </div>
  );
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: "Domicilio",
  pickup: "Recoger en tienda",
  counter: "Venta local",
  qr: "Otro",
  phone: "Otro",
  table: "Otro",
  unknown: "Otro",
};

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");
  const [error, setError] = useState("");
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const restaurantId = getStoredRestaurantId();
      if (!restaurantId) {
        setError("No se encontró el restaurante.");
        setLoading(false);
        return;
      }

      const daysAgo = Number(dateRange);
      const { start, startKey, end, endKey } = getReportDateRange(daysAgo);

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("total, status, order_type, items, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", start)
        .lt("created_at", end)

      if (fetchError) throw fetchError;

      const orders = ((data || []) as ReportOrder[]).filter((order) => {
        const orderDate = getBogotaDate(new Date(order.created_at));
        return (
          order.status === "completed" &&
          orderDate >= startKey &&
          orderDate < endKey
        );
      });
      const totalRevenue =
        orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      orders.forEach((order) => {
        let items: ReportOrderItem[] = [];
        if (Array.isArray(order.items)) {
          items = order.items;
        } else if (typeof order.items === "string") {
          try {
            const parsedItems: unknown = JSON.parse(order.items);
            if (Array.isArray(parsedItems)) {
              items = parsedItems as ReportOrderItem[];
            }
          } catch {
            items = [];
          }
        }
        items.forEach((item) => {
          if (!item.name) return;
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
      orders.forEach((order) => {
        const dateKey = getBogotaDate(new Date(order.created_at));
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { revenue: 0, orders: 0 };
        }
        dailyData[dateKey].revenue += Number(order.total || 0);
        dailyData[dateKey].orders += 1;
      });

      const dailyRevenue = Object.entries(dailyData)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([dateKey, data]) => {
          const [, month, day] = dateKey.split("-");
          return { date: `${day}/${month}`, ...data };
        })
        .slice(-14);

      // Order type distribution
      const typeCounts: Record<string, number> = {};
      orders.forEach((order) => {
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
  }, [dateRange]);

  useEffect(() => {
    void fetchReportData();
  }, [fetchReportData]);

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
        <Card className="min-w-0 rounded-2xl shadow-sm border border-border">
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
            <LineReportChart data={reportData.dailyRevenue} />
          )}
        </Card>

        <Card className="min-w-0 rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-bold text-text mb-4">
            Distribución por tipo de pedido
          </h3>
          {reportData.orderTypeDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-text-secondary">
              Sin datos para este periodo
            </div>
          ) : (
            <div className="h-[300px] w-full min-w-0 rounded-xl bg-slate-50 p-2">
              <div className="flex h-full items-center justify-center gap-8">
                <OrderTypeDonut data={reportData.orderTypeDistribution} />
                <div className="space-y-3 text-sm text-slate-700">
                  {reportData.orderTypeDistribution.map((entry, index, entries) => {
                    const total = entries.reduce((sum, item) => sum + item.count, 0);
                    return (
                      <div
                        key={entry.type}
                        className="flex cursor-help items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white"
                        title={`${entry.type}: ${entry.count} ${entry.count === 1 ? "pedido" : "pedidos"} (${((entry.count / total) * 100).toFixed(0)}%)`}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="font-medium">{entry.type}</span>
                        <span className="text-slate-500">
                          {((entry.count / total) * 100).toFixed(0)}%
                        </span>
                        <span className="sr-only">
                          {`${entry.count} ${entry.count === 1 ? "pedido" : "pedidos"}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Top Items */}
      <Card className="min-w-0 rounded-2xl shadow-sm border border-border">
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
      <Card className="min-w-0 rounded-2xl shadow-sm border border-border">
        <h3 className="text-lg font-bold text-text mb-4">Pedidos diarios</h3>
        {reportData.dailyRevenue.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-text-secondary">
            Sin datos para este periodo
          </div>
        ) : (
          <BarReportChart data={reportData.dailyRevenue} />
        )}
      </Card>
    </div>
  );
};

export default Reports;