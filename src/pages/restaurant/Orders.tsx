import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
  ExternalLink,
  Volume2,
  VolumeX,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Input,
  Loading,
} from "../../components/ui";
import {
  subscribeToOrders,
  updateOrderStatus,
  createOrder,
  getAvailableMenuItems,
} from "../../services/restaurantService";
import type { MenuItem, Order } from "../../config/supabase";
import {
  formatDateTime,
  formatCurrency,
  normalizePhoneInput,
  playSound,
} from "../../utils/helpers";
import { buildWhatsAppMessage } from "../../utils/whatsappMessages";

const getStatusLabel = (status: string) =>
  ({
    pending: "Pendiente",
    preparing: "En preparación",
    ready: "Listo",
    completed: "Entregado",
    cancelled: "Cancelado",
    rejected: "Rechazado",
  }[status] || status);

const getProductQuantity = (order: Order): number =>
  order.items?.reduce((total, item) => total + (Number(item.quantity) || 0), 0) || 0;

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showLocalSaleModal, setShowLocalSaleModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const knownOrderIdsRef = useRef<Set<string> | null>(null);
  const soundEnabledStorageKey = "restaurant-order-sound-enabled";
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(soundEnabledStorageKey) === "true"
  );
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToOrders(user.restaurant_id, (data) => {
      const currentOrderIds = new Set(data.map((order) => order.id));
      const knownOrderIds = knownOrderIdsRef.current;

      if (!knownOrderIds) {
        knownOrderIdsRef.current = currentOrderIds;
        setOrders(data);
        setLoading(false);
        return;
      }

      const newOrders = data.filter(
        (order) => order.status === "pending" && !knownOrderIds.has(order.id)
      );
      newOrders.forEach((order) => {
        toast.success(`Nuevo pedido #${order.order_number}`, {
          description: "Revisa los detalles para aceptarlo.",
        });
        if (soundEnabledRef.current) {
          void playSound("notification");
        } else {
          toast.info("Sonido desactivado", {
            description: "Actívalo para escuchar nuevos pedidos.",
          });
        }
      });

      knownOrderIdsRef.current = currentOrderIds;
      setOrders(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const enableSound = async () => {
    const played = await playSound("notification");
    if (played) {
      localStorage.setItem(soundEnabledStorageKey, "true");
      soundEnabledRef.current = true;
      setSoundEnabled(true);
      toast.success("Sonido activado", {
        description: "Te avisaremos cuando llegue un nuevo pedido.",
      });
    } else {
      toast.error("No se pudo activar el sonido", {
        description: "Revisa los permisos de sonido del navegador.",
      });
    }
  };

  const disableSound = () => {
    localStorage.setItem(soundEnabledStorageKey, "false");
    soundEnabledRef.current = false;
    setSoundEnabled(false);
    toast.info("Sonido desactivado");
  };

  const filteredOrders = orders
    .filter((order) =>
      statusFilter === "rejected"
        ? order.status === "rejected" || order.status === "cancelled"
        : order.status === statusFilter
    )
    .sort((a, b) => {
      // Oldest first (FIFO)
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    const success = await updateOrderStatus(orderId, newStatus);
    if (!success) {
      toast.error("No se pudo actualizar el pedido");
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const restaurantId = JSON.parse(localStorage.getItem("user") || "{}")
    .restaurant_id as string | undefined;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "warning" | "success" | "neutral" | "error"> = {
      pending: "warning",
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    return (
      <Badge variant={variants[status] || "neutral"}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "preparing":
        return <Package className="w-5 h-5 text-accent-secondary" />;
      case "ready":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return <Clock className="w-5 h-5 text-text-secondary" />;
    }
  };

  const getOrderTypeLabel = (order: Order) =>
    order.order_type === "delivery"
      ? "Domicilio"
      : order.order_type === "pickup"
      ? "Recogida"
      : order.table_number
      ? `Mesa ${order.table_number}`
      : "Para llevar";

  const getOrderAccent = (status: string) =>
    ({
      pending: "border-l-warning",
      preparing: "border-l-accent-secondary",
      ready: "border-l-success",
      completed: "border-l-success",
      rejected: "border-l-error",
      cancelled: "border-l-text-secondary",
    }[status] || "border-l-border");

  if (loading) {
    return <Loading text="Cargando pedidos..." />;
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="orders-view min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="mb-1 text-2xl font-bold text-text sm:mb-2 sm:text-3xl">Pedidos</h2>
          <p className="max-w-2xl text-xs text-text-secondary sm:text-sm">
            Gestiona y sigue los pedidos de tus clientes en tiempo real.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {pendingCount > 0 && (
            <Badge variant="warning" className="whitespace-nowrap px-3 py-2 text-xs animate-pulse sm:text-sm">
              {pendingCount} pendientes
            </Badge>
          )}
          <Button size="sm" className="flex-1 whitespace-nowrap sm:flex-none" icon={<Plus className="h-4 w-4" />} onClick={() => setShowLocalSaleModal(true)}>
            <span className="sm:hidden">Venta local</span>
            <span className="hidden sm:inline">Registrar venta</span>
          </Button>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-success">
        <div className="flex min-w-0 items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="truncate text-xs sm:text-sm">Pedidos en tiempo real</span>
        </div>
        <button
          type="button"
          onClick={soundEnabled ? disableSound : enableSound}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-accent hover:text-text"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-success" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{soundEnabled ? "Sonido activado" : "Activar sonido"}</span>
          <span className="sm:hidden">{soundEnabled ? "Sonido" : "Activar"}</span>
        </button>
      </div>

      {/* Status Filter */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {["pending", "preparing", "ready", "rejected", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              statusFilter === status
                ? "bg-accent text-white"
                : "bg-bg-subtle text-text-secondary hover:bg-border"
            }`}
          >
            {getStatusLabel(status)}
            {status === "pending" && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="px-4 py-10 text-center sm:py-12">
          <Package className="mx-auto mb-4 h-12 w-12 text-text-secondary opacity-50 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-semibold text-text sm:text-xl">
            No hay pedidos
          </h3>
          <p className="text-sm text-text-secondary">
            No hay pedidos {statusFilter === "pending" ? "pendientes" : "en este estado"} por ahora.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`group overflow-hidden rounded-2xl border-l-4 p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${getOrderAccent(order.status)}`}
            >
              <div className="flex flex-col lg:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-bg-subtle/60 px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white p-2 shadow-sm sm:p-2.5">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                          Pedido
                        </p>
                        <h3 className="mt-0.5 break-all text-sm font-bold text-text sm:text-base">
                          #{order.order_number}
                        </h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="grid gap-4 px-4 py-4 sm:px-5 sm:grid-cols-[1fr_auto]">
                    <div className="grid min-w-0 gap-3 text-xs sm:grid-cols-2 sm:text-sm">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Package className="h-4 w-4 text-accent-secondary" />
                        <span className="break-words">{getOrderTypeLabel(order)}</span>
                      </div>
                      {order.customer_name && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <User className="h-4 w-4 text-accent-secondary" />
                          <span className="break-words">{order.customer_name}</span>
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Phone className="h-4 w-4 text-accent-secondary" />
                          <a href={`tel:${order.customer_phone}`} className="text-accent hover:underline">
                            <span className="break-all">{order.customer_phone}</span>
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-text-secondary">
                        <span className="font-semibold text-text">
                          {getProductQuantity(order)} {getProductQuantity(order) === 1 ? "producto" : "productos"}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 text-left sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">Total</p>
                      <p className="mt-1 text-lg font-bold text-text sm:text-xl">{formatCurrency(order.total)}</p>
                    </div>
                  </div>

                  {order.customer_notes && (
                    <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-sm">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent-secondary" />
                      <p className="text-text-secondary">
                        <span className="font-semibold text-text">Nota:</span> {order.customer_notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 border-t border-border bg-white p-3 sm:flex-row lg:w-[190px] lg:flex-col lg:border-l lg:border-t-0 lg:p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    fullWidth
                    onClick={() => handleViewDetails(order)}
                  >
                    Ver detalles
                  </Button>

                  {order.status === "pending" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs sm:text-sm"
                        fullWidth
                        onClick={() => handleStatusUpdate(order.id, "preparing")}
                      >
                        Aceptar y preparar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}

                  {order.status === "preparing" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs sm:text-sm"
                      fullWidth
                      onClick={() => handleStatusUpdate(order.id, "ready")}
                    >
                      Marcar como listo
                    </Button>
                  )}
                  {order.status === "ready" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs sm:text-sm"
                      fullWidth
                      onClick={() => handleStatusUpdate(order.id, "completed")}
                    >
                      Marcar como entregado
                    </Button>
                  )}
                    {(order.status === "preparing" || order.status === "ready") &&
                      order.customer_phone && (
                      <button
                        type="button"
                        onClick={() => {
                          const ctx =
                            order.status === "preparing"
                              ? {
                                  type: "order_preparing" as const,
                                  customerName: order.customer_name || "",
                                  orderNumber: order.order_number,
                                }
                              : order.order_type === "delivery"
                                ? {
                                    type: "order_delivery_ready" as const,
                                    customerName: order.customer_name || "",
                                    orderNumber: order.order_number,
                                  }
                                : {
                                    type: "order_pickup_ready" as const,
                                    customerName: order.customer_name || "",
                                    orderNumber: order.order_number,
                                  };
                          const msg = buildWhatsAppMessage(ctx);
                          const url = `https://api.whatsapp.com/send?phone=${order.customer_phone!.replace(
                            /\D/g,
                            ""
                          )}&text=${encodeURIComponent(msg)}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-subtle hover:text-text sm:text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        WhatsApp
                      </button>
                    )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        order={selectedOrder}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
      />

      {/* Reject Modal */}
      <RejectOrderModal
        isOpen={showRejectModal}
        order={selectedOrder}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedOrder(null);
        }}
        onReject={handleStatusUpdate}
      />
      <LocalSaleModal
        isOpen={showLocalSaleModal}
        restaurantId={restaurantId}
        onClose={() => setShowLocalSaleModal(false)}
        onCreated={() => setShowLocalSaleModal(false)}
      />
    </div>
  );
};

// Order Details Modal Component
interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pedido #${order.order_number}`}
      size="xl"
      contentClassName="p-0"
    >
      <div className="order-detail-ticker">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">
              {order.order_type === "counter" ? "Venta local" : "Pedido digital"} ·{" "}
              {formatDateTime(order.created_at)}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant={order.status === "completed" ? "success" : order.status === "pending" ? "warning" : "neutral"}>
                {getStatusLabel(order.status)}
              </Badge>
              <span className="text-sm font-semibold text-text">
                {getProductQuantity(order)} {getProductQuantity(order) === 1 ? "producto" : "productos"}
              </span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-text-secondary">Total</p>
            <p className="text-2xl font-bold text-text">{formatCurrency(order.total)}</p>
          </div>
        </div>

        <div className="border-b border-border px-4 py-5 sm:px-6">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
            Productos del pedido
          </h4>
          <div className="order-items-ticker flex gap-3 overflow-x-auto pb-2">
            {order.items?.map((item: { quantity: number; name: string; selected_size?: { name: string }; selected_addons?: { name: string }[]; item_total?: number }, index: number) => (
              <div key={index} className="min-w-[210px] rounded-xl border border-border bg-white p-4">
                <p className="text-sm font-bold text-text">{item.quantity}× {item.name}</p>
                {item.selected_size?.name && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Tamaño: {item.selected_size.name}
                  </p>
                )}
                {item.selected_addons && item.selected_addons.length > 0 && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Adicionales: {item.selected_addons
                      .map((addon: { name: string }) => addon.name)
                      .join(", ")}
                  </p>
                )}
                <p className="mt-4 text-right text-sm font-bold text-text">
                  {formatCurrency(item.item_total ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 px-4 py-5 sm:px-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
              Información
            </h4>
            {order.customer_name && <p><strong>Cliente:</strong> {order.customer_name}</p>}
            {order.customer_phone && <p><strong>Teléfono:</strong> {order.customer_phone}</p>}
            {order.delivery_address && <p><strong>Dirección:</strong> {order.delivery_address}</p>}
            {order.order_type === "delivery" && (order.delivery_latitude != null && order.delivery_longitude != null || order.delivery_address) && (
              <a
                href={
                  order.delivery_latitude != null && order.delivery_longitude != null
                    ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}&travelmode=driving`
                    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address || "")}&travelmode=driving`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 px-3 py-1 border-2 border-black bg-yellow-400 text-black font-black uppercase text-xs"
              >
                Cómo llegar
              </a>
            )}
            {order.table_number && <p><strong>Mesa:</strong> {order.table_number}</p>}
            {order.customer_notes && (
              <p className="mt-3 rounded-lg bg-accent-secondary/10 p-3 text-text-secondary">
                <strong className="text-text">Nota:</strong> {order.customer_notes}
              </p>
            )}
          </div>
          <div className="min-w-0 self-end border-t border-border pt-3 text-sm md:min-w-[220px] md:border-l md:border-t-0 md:pl-6">
            <div className="flex justify-between gap-6 text-text-secondary">
              <span>Productos</span><span>{formatCurrency(order.subtotal)}</span>
            </div>
            {(order.discount ?? 0) > 0 && (
              <div className="mt-2 flex justify-between gap-6 text-success">
                <span>Descuento</span><span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between gap-6 border-t border-border pt-3 text-lg font-bold text-text">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-6 py-4">
          <Button onClick={onClose} fullWidth className="text-sm sm:text-base">Cerrar detalle</Button>
        </div>
      </div>
    </Modal>
  );
};

// Cancel Order Modal Component
interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onReject: (orderId: string, status: Order["status"], notes?: string) => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onReject,
}) => {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!order) return;
    onReject(order.id, "rejected", reason);
    onClose();
    setReason("");
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rechazar pedido" size="md" contentClassName="p-0">
      <div className="overflow-hidden">
        <div className="border-b border-border bg-warning/10 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-warning/20 p-2 text-warning">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-text">
                ¿Quieres rechazar el pedido #{order.order_number}?
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Esta acción cambiará el estado del pedido y no se puede deshacer.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div className="rounded-xl border border-border bg-bg-subtle p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-text-secondary">Productos</span>
              <span className="font-semibold text-text">
                {getProductQuantity(order)} {getProductQuantity(order) === 1 ? "producto" : "productos"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-text-secondary">Total</span>
              <span className="font-bold text-text">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <Textarea
            label="Motivo del rechazo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: producto agotado, cocina cerrada o solicitud del cliente"
            rows={4}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" onClick={onClose} fullWidth>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleCancel} fullWidth>
              Confirmar rechazo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

interface LocalSaleModalProps {
  isOpen: boolean;
  restaurantId?: string;
  onClose: () => void;
  onCreated: () => void;
}

type LocalSaleLine = Pick<MenuItem, "id" | "name" | "base_price"> & {
  quantity: number;
};

const LocalSaleModal: React.FC<LocalSaleModalProps> = ({
  isOpen,
  restaurantId,
  onClose,
  onCreated,
}) => {
  const [items, setItems] = useState<LocalSaleLine[]>([]);
  const [menuItems, setMenuItems] = useState<
    Pick<MenuItem, "id" | "name" | "base_price" | "is_available">[]
  >([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen || !restaurantId) return;
    void (async () => {
      setLoadingMenu(true);
      try {
        const { data } = await getAvailableMenuItems(restaurantId);
        setMenuItems(data);
      } finally {
        setLoadingMenu(false);
      }
    })();
  }, [isOpen, restaurantId]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.base_price * item.quantity,
    0
  );
  const total = subtotal;
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (itemId: string) => {
    const item = menuItems.find((menuItem) => menuItem.id === itemId);
    if (!item) return;
    setItems((current) => {
      const existing = current.find((selected) => selected.id === item.id);
      if (existing) {
        return current.map((selected) =>
          selected.id === item.id
            ? { ...selected, quantity: selected.quantity + 1 }
            : selected
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const reset = () => {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setNotes("");
    setSearch("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId || items.length === 0) {
      toast.error("Agrega al menos un producto a la venta");
      return;
    }

    setLoading(true);
    const { error } = await createOrder({
      restaurant_id: restaurantId,
      order_type: "counter",
      delivery_address: deliveryAddress.trim() || undefined,
      customer_name: customerName.trim() || "Venta local",
      customer_phone: customerPhone.trim() || undefined,
      items: items.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        item_total: item.base_price * item.quantity,
      })),
      subtotal,
      total,
      status: "pending",
      customer_notes: notes.trim() || undefined,
    });
    setLoading(false);

    if (error) {
      toast.error(`No se pudo registrar la venta: ${error.message}`);
      return;
    }

    toast.success("Venta local registrada");
    reset();
    onCreated();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar venta local" size="xl" contentClassName="p-0">
      <form onSubmit={submit} className="local-sale-modal">
        <div className="border-b border-border px-6 py-2 text-xs text-text-secondary">
          Toca los productos que vendiste. Cliente y mesa son opcionales.
        </div>
        <div className="grid min-h-0 md:min-h-[560px] md:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-border p-4 sm:p-6 md:border-b-0 md:border-r">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en tu menú"
                className="input pl-9 text-sm"
              />
            </div>
            {loadingMenu ? (
              <p className="text-sm text-text-secondary">Cargando menú...</p>
            ) : filteredMenuItems.length === 0 ? (
              <p className="text-sm text-text-secondary">No encontramos productos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredMenuItems.map((item) => {
                  const selected = items.find((line) => line.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item.id)}
                      className="relative min-h-[96px] rounded-xl border border-border bg-white p-3 text-left transition hover:border-accent hover:shadow-sm"
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs font-bold text-white">
                          {selected.quantity}
                        </span>
                      )}
                      <span className="block pr-5 text-sm font-bold text-text">{item.name}</span>
                      <span className="mt-2 block text-xs text-text-secondary">
                        {formatCurrency(item.base_price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col bg-bg-subtle/50 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-text">Venta actual</h3>
              <span className="text-xs text-text-secondary">
                {items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                {items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "producto" : "productos"}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-text-secondary">
                  Selecciona productos del menú para comenzar.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-text">{item.name}</p>
                      <button type="button" onClick={() => setItems((current) => current.filter((line) => line.id !== item.id))} aria-label={`Eliminar ${item.name}`}>
                        <Trash2 className="h-4 w-4 text-text-secondary hover:text-error" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button type="button" className="rounded border border-border px-2 py-1" onClick={() => setItems((current) => current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity - 1 } : line).filter((line) => line.quantity > 0))}>−</button>
                        <span className="text-sm font-bold">{item.quantity}</span>
                        <button type="button" className="rounded border border-border px-2 py-1" onClick={() => addItem(item.id)}>+</button>
                      </div>
                      <span className="text-sm font-bold text-text">{formatCurrency(item.base_price * item.quantity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nombre (opcional)" aria-label="Nombre del cliente opcional" />
                <Input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="Dirección (opcional)"
                  aria-label="Dirección opcional"
                />
              </div>
              <Input
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(normalizePhoneInput(event.target.value))
                }
                placeholder="Teléfono (opcional)"
                aria-label="Teléfono opcional"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
              />
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Nota para cocina (opcional)" rows={2} aria-label="Nota para cocina opcional" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">Total</span>
                <span className="text-2xl font-bold text-text">{formatCurrency(total)}</span>
              </div>
              <Button type="submit" loading={loading} fullWidth>
                Registrar venta
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default Orders;
