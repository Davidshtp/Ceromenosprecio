import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShoppingCart, Plus, Minus, X, Search, CheckCircle, Package } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert } from "../../components/ui";
import { subscribeToMenuItems, createOrder } from "../../services/restaurantService";
import type { MenuItem, MenuItemOption, RestaurantSettings, RestaurantHours, Restaurant } from "../../config/supabase";
import { formatCurrency, isValidPhone } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { getAddonsKey } from "../../utils/menuItem";
import { ProductCard } from "../../components/customer/ProductCard";
import { ProductDetailModal } from "../../components/customer/ProductDetailModal";

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-800">
                {restaurant.name}
              </h1>
              <p className="text-xs text-gray-500">
                {restaurant.restaurant_type}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for dishes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[108px] z-30">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  categoryFilter === category
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="mx-auto mb-3 h-10 w-10 text-text-secondary opacity-40" />
            <p className="text-sm text-text-secondary">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
        }}
      />

      {/* Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-accent font-bold text-sm w-6 h-6 rounded flex items-center justify-center">
                {cartCount}
              </div>
              <span className="font-bold text-base">
                {formatCurrency(
                  cart.reduce(
                    (sum, item) => sum + item.itemTotal * item.quantity,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>Ver carrito</span>
              <span className="text-lg">›</span>
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
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
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
                    <p className="text-accent font-semibold mt-1">
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
                Continuar al pago
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
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  onClose,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

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

    if (orderType === "table" && !tableNumber.trim()) {
      setError("Ingresa el número de mesa");
      return;
    }

    setLoading(true);

    const orderData = {
      restaurant_id: restaurantId,
      order_type: (orderType === "table" ? "qr" : "counter") as
        | "qr"
        | "counter",
      table_number: orderType === "table" ? tableNumber : undefined,
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
      tax,
      total,
      customer_notes: notes,
    };

    const { error: orderError } = await createOrder(orderData);
    setLoading(false);

    if (!orderError) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 2000);
    } else {
      setError(orderError?.message || "No se pudo realizar el pedido");
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setTableNumber("");
    setNotes("");
    setOrderType("table");
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
            Your order has been placed successfully. The restaurant will prepare
            it shortly.
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType("table")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "table"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Comer en el restaurante (Mesa)
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "takeaway"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Para llevar
            </button>
          </div>
        </div>

        {/* Table Number (only for table orders) */}
        {orderType === "table" && (
          <Input
            label="Número de mesa"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Ingresa tu número de mesa"
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
          label="Phone Number"
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Número de celular de 10 dígitos"
          required
          helperText="Usaremos esto para contactarte sobre tu pedido"
        />

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">Special Instructions (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests for your order..."
            rows={3}
            className="input-field"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">Order Summary</h4>
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
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Tax (5%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-text pt-2 border-t border-border">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Place Order
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
