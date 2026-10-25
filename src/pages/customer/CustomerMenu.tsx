  import React, { useCallback, useEffect, useMemo, useState } from "react";
  import { useParams } from "react-router-dom";
  import { ShoppingCart, Plus, Minus, X, Search, CheckCircle, Package, MessageCircle, Instagram, Clock } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert } from "../../components/ui";
import { subscribeToMenuItems, createOrder } from "../../services/restaurantService";
import type { MenuItem, MenuItemOption, RestaurantSettings, RestaurantHours, Restaurant } from "../../config/supabase";
import { formatCurrency, isValidPhone } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { getAddonsKey } from "../../utils/menuItem";
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

  // Load restaurant and menu
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const restaurantName = settings?.display_name || restaurant?.name;
  const restaurantLogo = settings?.logo_url || restaurant?.logo_url;
  const primaryColor = settings?.primary_color || "#000000";
  const secondaryColor = settings?.secondary_color || "#6366F1";

  const whatsappLink = useMemo(() => {
    if (!settings?.whatsapp) return null;
    const digits = settings.whatsapp.replace(/[^0-9]/g, "");
    if (!digits) return null;
    const message = encodeURIComponent(
      `Hola, te escribo desde el menú de ${restaurantName}. Me gustaría hacer una consulta.`
    );
    return `https://wa.me/${digits}?text=${message}`;
  }, [settings?.whatsapp, restaurantName]);

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
    return <Loading text="Loading menu..." />;
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
            El restaurante que buscas no existe o está inactivo
            inactive.
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
      className="mono-interface min-h-screen bg-bg-subtle pb-20"
      style={styleVars}
    >
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {restaurantLogo && (
                <img
                  src={restaurantLogo}
                  alt={restaurantName}
                  className="h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 object-contain shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-base sm:text-lg text-text leading-tight">
                  {restaurantName}
                </h1>
                {settings?.description && (
                  <p className="text-xs text-text-secondary truncate sm:max-w-[320px]">
                    {settings.description}
                  </p>
                )}
                {!settings?.description && (
                  <p className="text-xs text-text-secondary">
                    {restaurant.restaurant_type}
                  </p>
                )}
              </div>
            </div>
            {(whatsappLink || instagramLink || (hours && hours.length > 0)) && (
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-border px-2.5 py-2 sm:px-3 text-xs font-medium text-text hover:bg-primary/5 transition-colors"
                    style={{ borderColor: primaryColor }}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                    <span className="hidden sm:inline">Mensaje por WhatsApp</span>
                  </a>
                )}
                {instagramLink && (
                  <a
                    href={instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-border px-2.5 py-2 sm:px-3 text-xs font-medium text-text hover:bg-primary/5 transition-colors"
                    style={{ borderColor: primaryColor }}
                  >
                    <Instagram className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                    <span className="hidden sm:inline">Instagram</span>
                  </a>
                )}
                {hours && hours.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHoursModal(true)}
                    className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-border px-2.5 py-2 sm:px-3 text-xs font-medium text-text hover:bg-primary/5 transition-colors"
                    style={{ borderColor: primaryColor }}
                  >
                    <Clock className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                    <span className="hidden sm:inline">Horarios</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative mt-2 sm:mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar platillos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              style={{
                borderColor: "rgba(0,0,0,0.2)",
                outlineColor: primaryColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Closed Menu Banner */}
      {settings?.is_temporarily_closed && (
        <div className="max-w-screen-lg mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="rounded-2xl border border-border bg-bg-subtle p-4 sm:p-6 shadow-sm text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-text/10">
                <X className="h-6 w-6 text-text" />
              </div>
              <h3 className="text-lg font-bold text-text">
                Menú temporalmente cerrado
              </h3>
              <p className="text-sm text-text-secondary max-w-md">
                {settings.closed_message || "En este momento no estamos recibiendo pedidos."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-screen-lg mx-auto px-3 sm:px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === category
                    ? "bg-primary text-primary-content"
                    : "bg-bg-subtle border border-border text-text-secondary hover:bg-primary/10 hover:text-primary"
                }`}
                style={{
                  backgroundColor:
                    categoryFilter === category
                      ? primaryColor
                      : "rgba(249,250,251,1)",
                  color:
                    categoryFilter === category ? "#ffffff" : "#6b7280",
                  borderColor:
                    categoryFilter === category ? primaryColor : "rgba(0,0,0,0.1)",
                }}
              >
                {category === "all" ? "Todos" : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <Package className="mx-auto mb-3 h-8 w-8 sm:h-10 sm:w-10 text-text-secondary opacity-40" />
            <p className="text-sm text-text-secondary">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
      {/* Cart Modal */}
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

      {/* Product Detail Modal */}
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

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        restaurantId={restaurant.id}
        settings={settings}
        primaryColor={primaryColor}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
        }}
      />

      {/* Hours Modal */}
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
                  className="flex items-center justify-between rounded-lg border border-border p-3"
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

      {/* Bottom Cart Bar */}
      {cartCount > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40"
          style={{ backgroundColor: primaryColor }}
        >
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`bg-white text-[#${primaryColor}] font-bold text-xs sm:text-sm w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center`}>
                {cartCount}
              </div>
              <span className="font-bold text-sm sm:text-base">
                {formatCurrency(
                  cart.reduce(
                    (sum, item) => sum + item.itemTotal * item.quantity,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm">
              <span>Ver carrito</span>
              <span className="text-base sm:text-lg">›</span>
            </div>
          </button>
        </div>
      )}
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
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-bg-subtle rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-text">{item.name}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-text-secondary">
                        Tamaño: {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        Adicionales:{" "}
                        {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className={`text-[#${primaryColor}] font-semibold mt-1`}>
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 text-error hover:bg-error/10 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-xl font-bold text-text mb-4">
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
  primaryColor: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  settings,
  primaryColor,
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
        resetForm();
      }, 1500);
    } else {
      toast.error(orderError?.message || "No se pudo realizar el pedido");
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setNotes("");
    setOrderType(availableTypes[0].value);
    setSuccess(false);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar pedido" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Order Type */}
        <div>
          <label className="label mb-3">Tipo de pedido</label>
          <div className={`grid gap-3 ${availableTypes.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {availableTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setOrderType(type.value)}
                className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                  orderType === type.value
                    ? `border-[#${primaryColor}] bg-[#${primaryColor}]/10 text-[#${primaryColor}]`
                    : "border-border hover:border-accent/50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Address (only for delivery orders) */}
        {orderType === "delivery" && (
          <Input
            label="Dirección de domicilio"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Calle, número, barrio, ciudad..."
            required
          />
        )}

        {/* Customer Details */}
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

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">Instrucciones especiales (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Sin cebolla, punto de cocción, etc."
            rows={3}
            className="input-field"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">Resumen del pedido</h4>
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
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
