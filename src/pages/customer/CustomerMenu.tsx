import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle,
  Package,
  MessageCircle,
  Instagram,
  Clock,
} from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert } from "../../components/ui";
import { subscribeToMenuItems, createOrder } from "../../services/restaurantService";
import type {
  MenuItem,
  MenuItemOption,
  RestaurantSettings,
  RestaurantHours,
  Restaurant,
} from "../../config/supabase";
import { formatCurrency, isValidPhone } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { getAddonsKey } from "../../utils/menuItem";
import { buildWhatsAppMessage } from "../../utils/whatsappMessages";
import { ProductCard } from "../../components/customer/ProductCard";
import { ProductDetailModal } from "../../components/customer/ProductDetailModal";
import { toast } from "sonner";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: MenuItemOption;
  selectedAddons: MenuItemOption[];
  itemTotal: number;
}

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [hours, setHours] = useState<RestaurantHours[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  const loadRestaurant = useCallback(async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Restaurant not found");
      setLoading(false);
      return;
    }

    setRestaurant(data);

    const { data: settingsData } = await supabase
      .from("restaurant_settings")
      .select("*")
      .eq("restaurant_id", data.id)
      .maybeSingle();
    setSettings(settingsData);
    const { data: hoursData } = await supabase
      .from("restaurant_hours")
      .select("*")
      .eq("restaurant_id", data.id)
      .order("day_of_week", { ascending: true });
    setHours(hoursData || []);
  }, [slug]);

  useEffect(() => {
    loadRestaurant();
  }, [slug, loadRestaurant]);

  useEffect(() => {
    if (restaurant?.id) {
      const subscription = subscribeToMenuItems(restaurant.id, (data) => {
        setMenuItems(data);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [restaurant]);

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category_name).filter(Boolean)),
  ];

  const isOpenNow = () => {
    if (settings?.is_temporarily_closed === true) return false;

    const today = hours.find((hour) => hour.day_of_week === new Date().getDay());
    if (!today) return true;
    if (!today.is_open) return false;
    if (!today.opening_time || !today.closing_time) return true;

    const current = new Date().toTimeString().slice(0, 5);
    const isWithinRange = (openingTime: string, closingTime: string) => {
      if (openingTime <= closingTime) {
        return current >= openingTime && current <= closingTime;
      }
      return current >= openingTime || current <= closingTime;
    };

    if (isWithinRange(today.opening_time, today.closing_time)) {
      return true;
    }

    if (today.second_opening_time && today.second_closing_time) {
      return isWithinRange(today.second_opening_time, today.second_closing_time);
    }

    return false;
  };

  const restaurantIsOpen = isOpenNow();

  const restaurantName = settings?.display_name || "";
  const restaurantLogo = settings?.logo_url || restaurant?.logo_url;
  const primaryColor = "#000000";
  const secondaryColor = "#6366F1";

  const whatsappLink = useMemo(() => {
    if (!settings?.whatsapp) return null;
    const digits = settings.whatsapp.replace(/[^0-9]/g, "");
    if (!digits) return null;
    return digits;
  }, [settings?.whatsapp]);

  const openWhatsApp = () => {
    if (!whatsappLink) return;
    const message = buildWhatsAppMessage({
      type: "menu_contact",
      restaurantName: restaurantName || restaurant?.name || "Cero Menosprecio",
    });
    const url = `https://api.whatsapp.com/send?phone=${whatsappLink}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const instagramLink = useMemo(() => {
    if (!settings?.instagram_url) return null;
    let url = settings.instagram_url.trim();
    if (url.startsWith("@")) {
      url = `https://instagram.com/${url.slice(1)}`;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://instagram.com/${url.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    }
    return url;
  }, [settings?.instagram_url]);

  const styleVars = useMemo(
    () =>
      ({
        "--customer-primary": primaryColor,
        "--customer-secondary": secondaryColor,
      }) as React.CSSProperties,
    [primaryColor, secondaryColor]
  );

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category_name === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const activeItem = selectedItem
    ? menuItems.find((item) => item.id === selectedItem.id) ?? selectedItem
    : null;

  const addToCart = (
    item: MenuItem,
    selectedSize?: MenuItemOption,
    selectedAddons: MenuItemOption[] = [],
    quantity = 1
  ) => {
    if (!restaurantIsOpen || !item.is_available || quantity < 1) {
      return;
    }

    const unitPrice =
      (Number(selectedSize?.price) || Number(item.base_price) || 0) +
      (Array.isArray(selectedAddons)
        ? selectedAddons.reduce((sum, addon) => sum + (Number(addon.price) || 0), 0)
        : 0);
    const itemTotal = unitPrice;
    const addonsKey = getAddonsKey(selectedAddons);
    const sizeName = selectedSize?.name;

    setCart((current) => {
      const existingIndex = current.findIndex(
        (ci) =>
          ci.id === item.id &&
          ci.selectedSize?.name === sizeName &&
          getAddonsKey(ci.selectedAddons) === addonsKey
      );

      if (existingIndex >= 0) {
        return current.map((ci, index) =>
          index === existingIndex ? { ...ci, quantity: ci.quantity + quantity } : ci
        );
      }

      const cartItem: CartItem = {
        ...item,
        quantity,
        selectedSize,
        selectedAddons,
        itemTotal,
      };
      return [...current, cartItem];
    });

    setShowItemModal(false);
    setSelectedItem(null);
    toast.success("Agregado al carrito");
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  if (loading) {
    return <Loading text="Cargando menú..." />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">
            Restaurante no encontrado
          </h2>
          <p className="text-text-secondary">
            El restaurante que buscas no existe o está inactivo.
          </p>
        </Card>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    return cart.reduce((sum, cartItem) => {
      if (cartItem.id === itemId) {
        return sum + cartItem.quantity;
      }
      return sum;
    }, 0);
  };

  const handleAddSimple = (item: MenuItem) => {
    addToCart(item);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!restaurantIsOpen) return;
    const index = cart.findIndex((ci) => ci.id === itemId);
    if (index >= 0) {
      updateQuantity(index, -1);
    }
  };

  return (
    <div
      className="mono-interface min-h-screen bg-bg pb-24"
      style={styleVars}
    >
      {/* Header superior con logo grande centrado */}
      <div className="max-w-5xl mx-auto px-4 pt-0 pb-6 text-center">
        {/* Logo grande centrado */}
        <div className="flex justify-center mb-0">
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt={restaurantName}
              className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[280px] h-auto shrink-0 object-contain"
            />
          ) : (
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl flex items-center justify-center bg-accent/10 border-4 border-white text-accent font-black text-2xl md:text-3xl">
              {(restaurantName || restaurant?.name || "R").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {restaurantName && (
          <h2 className="text-3xl font-bold text-text mb-1">
            {restaurantName}
          </h2>
        )}
        {settings?.description && (
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl mx-auto mt-1">
            {settings.description}
          </p>
        )}
        {restaurantIsOpen ? (
          <span
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
              borderColor: `${primaryColor}30`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#22c55e" }}
            />
            Abierto ahora
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-text/5 text-text-secondary text-xs font-semibold border border-border">
            <X className="w-3 h-3" />
            Cerrado temporalmente
          </span>
        )}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-4 py-2">
            {whatsappLink && (
              <button
                type="button"
                onClick={openWhatsApp}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text transition-all hover:bg-[var(--customer-primary)]/10 hover:text-[var(--customer-primary)] hover:border-[var(--customer-primary)]/40 hover:-translate-y-0.5"
                style={{ borderColor: primaryColor }}
              >
                <MessageCircle className="w-4 h-4" style={{ color: primaryColor }} />
                WhatsApp
              </button>
            )}
            {instagramLink && (
              <a
                href={instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text transition-all hover:bg-[var(--customer-primary)]/10 hover:text-[var(--customer-primary)] hover:border-[var(--customer-primary)]/40 hover:-translate-y-0.5"
                style={{ borderColor: primaryColor }}
              >
                <Instagram className="w-4 h-4" style={{ color: primaryColor }} />
                Instagram
              </a>
            )}
            {hours && hours.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHoursModal(true)}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text transition-all hover:bg-[var(--customer-primary)]/10 hover:text-[var(--customer-primary)] hover:border-[var(--customer-primary)]/40 hover:-translate-y-0.5"
                style={{ borderColor: primaryColor }}
              >
                <Clock className="w-4 h-4" style={{ color: primaryColor }} />
                Horarios
              </button>
            )}
          </div>
        {/* Buscador */}
        <div className="relative mb-8">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Buscar platillos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 border border-border rounded-2xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus-ring-accent/30 focus:border-accent transition-all"
            style={{
              borderColor: "rgba(0,0,0,0.15)",
              outlineColor: primaryColor,
            }}
          />
        </div>

        {/* Categorías */}
        <div className="flex gap-2 overflow-x-auto py-2 mb-6 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category || "all")}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 ${
                categoryFilter === category
                  ? "bg-accent text-white border-accent"
                  : "bg-white border border-border text-text-secondary hover:bg-[var(--customer-primary)]/10 hover:text-[var(--customer-primary)] hover:border-[var(--customer-primary)]/40 hover:-translate-y-0.5 transition-all"
              }`}
            >
              {category === "all" ? "Todos" : category}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-text-secondary mb-4 opacity-40" />
            <h3 className="text-lg font-bold text-text mb-2">
              No se encontraron productos
            </h3>
            <p className="text-text-secondary">
              {searchTerm || categoryFilter !== "all"
                ? "Prueba cambiando los filtros."
                : "Aún no hay productos disponibles."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);

              return (
                <ProductCard
                  key={item.id}
                  item={item}
                  quantity={quantity}
                  restaurantIsOpen={restaurantIsOpen}
                  onOpen={handleItemClick}
                  onAdd={handleAddSimple}
                  onRemove={(product) => handleRemoveItem(product.id)}
                  primaryColor={primaryColor}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
        primaryColor={primaryColor}
      />

      {/* Detalle producto */}
      {activeItem && (
        <ProductDetailModal
          key={activeItem.id}
          isOpen={showItemModal}
          item={activeItem}
          restaurantIsOpen={restaurantIsOpen}
          onClose={() => {
            setShowItemModal(false);
            setSelectedItem(null);
          }}
          onAdd={addToCart}
        />
      )}

      {/* Checkout */}
      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        restaurantId={restaurant.id}
        settings={settings}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
        }}
      />

      {/* Horarios */}
      <Modal
        isOpen={showHoursModal}
        onClose={() => setShowHoursModal(false)}
        title="Horarios de atención"
        size="sm"
      >
        <div className="space-y-3">
          {hours.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">
              No hay horarios configurados.
            </p>
          ) : (
            hours.map((hour) => {
              const dayNames = [
                "Domingo",
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
              ];
              const dayName = dayNames[hour.day_of_week] || "Día";
              return (
                <div
                  key={hour.day_of_week}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <span className="text-sm font-medium text-text">{dayName}</span>
                  {hour.is_open ? (
                    <span className="text-sm text-text-secondary">
                      {hour.opening_time || "00:00"} - {hour.closing_time || "00:00"}
                    </span>
                  ) : (
                    <span className="text-sm text-text-secondary italic">Cerrado</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Barra fija del carrito */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          cartCount > 0 && !showItemModal && !showCart && !showCheckout && !showHoursModal
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: primaryColor }}
      >
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-accent text-white font-bold text-xs`}>
                    {cartCount}
                  </div>
                  <span className="font-bold text-text">
                    {formatCurrency(
                      cart.reduce(
                        (sum, item) => sum + item.itemTotal * item.quantity,
                        0
                      )
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setShowCart(true)}
                  className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cart Modal Component
interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
  primaryColor: string;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  primaryColor,
}) => {
  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tu carrito" size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-40" />
            <p className="text-text-secondary">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border"
                >
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-bg-subtle overflow-hidden">
                    {(item.product_images?.[0]?.url || item.image_url) && (
                      <img
                        src={item.product_images?.[0]?.url || item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text">{item.name}</h4>
                    {item.selectedSize && (
                      <p className="text-xs text-text-secondary">
                        Tamaño: {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-xs text-text-secondary">
                        Adicionales: {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className={`mt-1 text-[#${primaryColor}] font-bold`}>
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-text/5 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-text">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-text/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemove(index)}
                      className="w-8 h-8 rounded-full text-error hover:bg-error/5 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex justify-between text-xl font-bold text-text mb-6">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">
                Realizar pedido
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Checkout Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  restaurantId: string;
  settings: RestaurantSettings | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  settings,
  onClose,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const deliveryEnabled = settings?.delivery_enabled ?? true;
  const pickupEnabled = settings?.pickup_enabled ?? true;

  const availableTypes: { value: "delivery" | "pickup"; label: string }[] = [];
  if (deliveryEnabled) availableTypes.push({ value: "delivery", label: "Domicilio" });
  if (pickupEnabled) availableTypes.push({ value: "pickup", label: "Recoger en tienda" });

  if (availableTypes.length === 0) {
    availableTypes.push({ value: "delivery", label: "Domicilio" });
  }

  if (!orderType || !availableTypes.some((t) => t.value === orderType)) {
    setOrderType(availableTypes[0].value);
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const total = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Ingresa tu nombre");
      return;
    }

    if (!isValidPhone(customerPhone)) {
      setError("Ingresa un número de teléfono válido de 10 dígitos");
      return;
    }

    if (orderType === "delivery" && !deliveryAddress.trim()) {
      setError("Ingresa tu dirección de domicilio");
      return;
    }

    setLoading(true);

    const orderData = {
      restaurant_id: restaurantId,
      order_type: orderType,
      delivery_address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: cart.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal,
        special_instructions: undefined,
      })),
      subtotal,
      discount: 0,
      total,
      customer_notes: notes,
    };

    const { error: orderError } = await createOrder(orderData);
    setLoading(false);

    if (!orderError) {
      toast.success("¡Pedido realizado con éxito!");
      setTimeout(() => {
        onSuccess();
        setCustomerName("");
        setCustomerPhone("");
        setDeliveryAddress("");
        setNotes("");
        setOrderType(availableTypes[0].value);
        setSuccess(false);
      }, 1500);
    } else {
      toast.error(orderError?.message || "No se pudo realizar el pedido");
    }
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="¡Pedido realizado!" size="md">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-text mb-2">
            ¡Pedido realizado!
          </h3>
          <p className="text-text-secondary mb-6">
            Tu pedido ha sido enviado. El restaurante lo preparará en breve.
          </p>
          <Button onClick={onClose} fullWidth>
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar pedido" size="lg" position="bottom" showCloseButton={false} contentClassName="p-0">
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        {error && <Alert type="error" message={error} />}

        {/* Tipo de pedido */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">
            Tipo de pedido
          </label>
          <div className={`grid gap-3 ${availableTypes.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {availableTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setOrderType(type.value)}
                className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  orderType === type.value
                    ? "border-accent bg-accent text-white"
                    : "border-border hover:border-accent/50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dirección de domicilio */}
        {orderType === "delivery" && (
          <Input
            label="Dirección de domicilio"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Calle, número, barrio, ciudad..."
            required
          />
        )}

        {/* Datos del cliente */}
        <Input
          label="Tu nombre"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ingresa tu nombre"
          required
        />

        <Input
          label="Teléfono"
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Número de celular de 10 dígitos"
          required
          helperText="Usaremos esto para contactarte sobre tu pedido"
        />

        {/* Instrucciones especiales */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Instrucciones especiales (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Sin cebolla, punto de cocción, etc."
            rows={3}
            className="input"
          />
        </div>

        {/* Resumen */}
        <div className="bg-bg-subtle rounded-xl p-3 space-y-1.5">
          <h4 className="font-semibold text-text mb-2 text-sm">Resumen del pedido</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {item.name}
                {item.selectedSize && ` (${item.selectedSize.name})`}
              </span>
              <span className="text-text">
                {formatCurrency(item.itemTotal * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xl font-bold text-text pt-2 border-t border-border">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth size="sm">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Realizar pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
