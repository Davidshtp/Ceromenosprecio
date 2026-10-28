import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  ShoppingBag,
  Store,
  Phone,
  Utensils,
  Flame,
  ChevronDown,
  Instagram,
} from "lucide-react";
import { Card, Button, Input, Modal } from "../../components/ui";
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
import { ProductCard } from "../../components/customer/ProductCard";
import { ProductDetailModal } from "../../components/customer/ProductDetailModal";
import { toast } from "sonner";
import { buildWhatsAppMessage } from "../../utils/whatsappMessages";

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
    void (async () => {
      await loadRestaurant();
    })();
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

  const restaurantName = settings?.display_name || restaurant?.name || "Cero Menosprecio";
  const restaurantLogo = settings?.logo_url || restaurant?.logo_url;
  const primaryColor = "#000000";
  const secondaryColor = "#FACC15";
  const heroImage =
    menuItems.find(
      (i) => i.is_available && (i.product_images?.[0]?.url || i.image_url)
    )?.product_images?.[0]?.url ||
    menuItems.find(
      (i) => i.is_available && (i.product_images?.[0]?.url || i.image_url)
    )?.image_url ||
    restaurantLogo;

  const whatsappLink = useMemo(() => {
    if (!settings?.whatsapp) return null;
    const digits = settings.whatsapp.replace(/[^0-9]/g, "");
    if (!digits) return null;
    return digits;
  }, [settings]);

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
  }, [settings]);

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
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-6">
        <img src="/assets/brand/mascota en blanco.png" alt="Cero Menosprecio" className="h-28 w-28 object-contain animate-pulse mb-6" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400 mb-2 text-center">Cero Menosprecio</p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6 text-center">Cargando el menú...</h2>
        <div className="flex gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Card className="text-center p-8 bg-black border border-white/20">
          <Store className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Restaurante no encontrado
          </h2>
          <p className="text-white/60">
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
      className="mono-interface min-h-screen bg-white overflow-y-auto pb-24 no-scrollbar"
      style={{
        ...styleVars,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black text-white shadow-lg shadow-black/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex min-w-0 items-center gap-3" aria-label={`${restaurantName}, inicio`}>
            <img src="/assets/brand/mascota en blanco.png" alt={restaurantName} className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-black uppercase leading-tight tracking-tight sm:text-base">{restaurantName}</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-yellow-400 sm:text-[10px]">Groseras como ellas solas</span>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-[11px] font-black uppercase tracking-[0.18em] text-white/65 md:flex">
            <a href="#catalogo" className="text-yellow-400 transition-colors hover:text-white">Menú</a>
            <button type="button" onClick={() => setShowHoursModal(true)} className="transition-colors hover:text-yellow-400">Horarios</button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold sm:inline-flex">
              <span className={`h-2 w-2 rounded-full ${restaurantIsOpen ? "bg-emerald-400" : "bg-red-400"}`} />
              {restaurantIsOpen ? "Abierto ahora" : "Cerrado"}
            </span>
            <button type="button" onClick={() => setShowHoursModal(true)} aria-label="Ver horarios" className="flex h-9 items-center justify-center rounded-full border border-white/20 px-3 text-[10px] font-black uppercase tracking-wide text-white transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-black md:hidden">
              Horarios
            </button>
            {instagramLink && (
              <a href={instagramLink} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-black sm:h-10 sm:w-10">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {whatsappLink && (
              <button type="button" onClick={openWhatsApp} aria-label="Contactar por WhatsApp" className="hidden h-10 items-center justify-center gap-2 rounded-full border border-white/20 px-4 text-xs font-black transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-black sm:inline-flex">
                <Phone className="h-4 w-4" /> WhatsApp
              </button>
            )}
            <button type="button" onClick={() => setShowCart(true)} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-black transition hover:bg-yellow-300">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-black bg-white px-1 text-[10px] font-black text-black">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Hero principal de marca */}
      <section id="inicio" className="relative isolate overflow-hidden bg-black text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rotate-12 border-[24px] border-white/[0.035] sm:h-96 sm:w-96" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-2 w-2/5 bg-yellow-400" />
        <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:px-6 sm:py-12 md:grid-cols-[1.02fr_0.98fr] md:gap-10 md:py-16 lg:px-8 lg:py-20">
          <div className="relative order-2 z-10 md:order-1">
            <div className="mb-5 inline-flex items-center gap-2 border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300 sm:text-xs">
              <span className={`h-2 w-2 rounded-full ${restaurantIsOpen ? "bg-emerald-400" : "bg-red-400"}`} />
              {restaurantIsOpen ? "El antojo está abierto" : "Volvemos pronto"}
            </div>
            <h1 className="max-w-3xl text-[clamp(2.7rem,8vw,5.8rem)] font-black uppercase leading-[0.88] tracking-[-0.065em]">
              AQUÍ NO SE LE
              <span className="mt-1 block text-yellow-400">TACAÑEA</span>
              <span className="block">A NADA.</span>
            </h1>
            <div className="my-5 h-2 w-36 -rotate-2 bg-yellow-400 sm:my-6 sm:w-52" />
            <p className="max-w-xl text-lg font-black leading-tight sm:text-2xl">
              Las salchipapas más groseras de Mocoa, ve.
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/65 sm:text-base">
              Antójese sin miedo. Lo bueno viene a reventar.{" "}
              <Utensils className="inline h-4 w-4 text-white" />
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <a href="#catalogo" className="inline-flex min-h-12 items-center justify-center gap-2 bg-yellow-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:-translate-y-0.5 hover:bg-yellow-300">
                Ver el menú
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </a>
              {whatsappLink && (
                <button type="button" onClick={openWhatsApp} className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-5 py-3 text-sm font-black text-white transition hover:border-yellow-400 hover:text-yellow-400">
                  <Phone className="h-4 w-4" /> Hablemos
                </button>
              )}
            </div>
          </div>

          <div className="relative order-1 md:order-2">
            <div aria-hidden="true" className="absolute -inset-2 rotate-2 bg-yellow-400 sm:-inset-3" />
            <div className="relative aspect-[5/4] overflow-hidden border-4 border-black bg-zinc-900 sm:aspect-[4/3]">
              {heroImage ? (
                <img src={heroImage} alt="Salchipapas de Cero Menosprecio" className="h-full w-full object-cover" fetchPriority="high" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Utensils className="h-12 w-12 text-black" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4 sm:p-6">
                <div>
                  <span className="inline-block bg-yellow-400 px-2 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-black sm:text-[10px]">Cero tacañería</span>
                  <p className="mt-2 text-xl font-black uppercase leading-none text-white sm:text-3xl">Puro exceso.<br />Cero miedo.</p>
                </div>
                <Flame className="hidden h-9 w-9 sm:block text-yellow-400" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-black/45 sm:text-xs">Elegí tu próxima felicidad</p>
            <h2 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">BUSCÁ TU <span className="text-yellow-500">GROSERÍA.</span></h2>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45" />
            <input
              type="text"
              placeholder="Buscar salchipapas, hamburguesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar productos"
              className="min-h-12 w-full border-2 border-black/10 bg-white py-3 pl-11 pr-4 text-sm text-black placeholder:text-black/40 transition focus:border-black focus:outline-none"
            />
          </div>
        </div>

        <div className="-mx-4 mb-9 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:px-0">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category || "all")}
              className={`min-h-10 shrink-0 border-2 px-5 py-2 text-xs font-black uppercase tracking-wide transition ${
                categoryFilter === category
                  ? "border-black bg-black text-white"
                  : "border-black/15 bg-white text-black/65 hover:border-black hover:text-black"
              }`}
            >
              {category === "all" ? "Todos" : category}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="border-2 border-dashed border-black/15 px-5 py-14 text-center">
            <Utensils className="h-9 w-9" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-black uppercase">No encontramos esa grosería</h3>
            <p className="mt-2 text-sm text-black/55">Prueba con otra búsqueda o selecciona otra categoría.</p>
            <button type="button" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); }} className="mt-5 bg-black px-5 py-3 text-xs font-black uppercase text-white transition hover:bg-yellow-400 hover:text-black">Ver todos los productos</button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600">La casa recomienda</p>
                <h3 className="text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">LAS MÁS GROSERAS <span className="text-yellow-500">DE LA CASA</span></h3>
              </div>
              <span className="hidden shrink-0 text-xs font-bold text-black/45 sm:block">{filteredItems.length} {filteredItems.length === 1 ? "producto" : "productos"}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {filteredItems.slice(0, 3).map((item, index) => (
                <ProductCard
                  key={`featured-${item.id}`}
                  item={item}
                  quantity={getItemQuantity(item.id)}
                  restaurantIsOpen={restaurantIsOpen}
                  onOpen={handleItemClick}
                  onAdd={handleAddSimple}
                  onRemove={(product) => handleRemoveItem(product.id)}
                  isMoreSold={index === 0}
                />
              ))}
            </div>

            {filteredItems.length > 3 && (
              <div className="mt-12 border-t-2 border-black/10 pt-9 sm:mt-16 sm:pt-12">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-black/45">El antojo no termina</p>
                    <h3 className="text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">TODAS LAS <span className="text-yellow-500">GROSERÍAS</span></h3>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-black/45">{filteredItems.length} opciones</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredItems.slice(3).map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      quantity={getItemQuantity(item.id)}
                      restaurantIsOpen={restaurantIsOpen}
                      onOpen={handleItemClick}
                      onAdd={handleAddSimple}
                      onRemove={(product) => handleRemoveItem(product.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Banner de conversión */}
      <section className="relative overflow-hidden border-t-4 border-yellow-400 bg-black py-10 text-white sm:py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-400 rounded" />
              <h2 className="text-2xl md:text-3xl font-black">¿CON HAMBRE?</h2>
            </div>
            <p className="text-white/70 text-sm md:text-base max-w-md">
              Pide ya y disfruta la verdadera experiencia Cero Menosprecio.
            </p>
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2 rounded bg-yellow-400 text-black font-black px-6 py-3 text-sm md:text-base hover:bg-yellow-300 transition-colors"
            >
              HACER PEDIDO YA
            </a>
          </div>
        </div>
      </section>

      {/* Barra del carrito */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          cartCount > 0 && !showItemModal && !showCart && !showCheckout && !showHoursModal
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-5xl mx-auto px-4 py-1">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-accent text-white font-black text-[10px]">
                  {cartCount}
                </div>
                <span className="font-bold text-text text-sm">
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
                className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
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

      <Modal
        isOpen={showHoursModal}
        onClose={() => setShowHoursModal(false)}
        title="Horarios de atención"
        size="sm"
      >
        <div className="space-y-2">
          {hours.length === 0 ? (
            <p className="text-sm text-black/60 text-center py-4">
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
              const today = new Date().getDay() === hour.day_of_week;
              return (
                <div
                  key={hour.day_of_week}
                  className={`flex items-center justify-between border-2 px-4 py-3 transition ${
                    today
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white text-black"
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wide">
                    {dayName}
                    {today && (
                      <span className="ml-2 bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                        Hoy
                      </span>
                    )}
                  </span>
                  {hour.is_open ? (
                    <span
                      className={`text-xs font-bold ${
                        today ? "text-yellow-400" : "text-black/60"
                      }`}
                    >
                      {hour.opening_time || "00:00"} – {hour.closing_time || "00:00"}
                      {hour.second_opening_time && hour.second_closing_time && (
                        <span className="ml-1">
                          · {hour.second_opening_time} – {hour.second_closing_time}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-bold italic ${
                        today ? "text-white/60" : "text-black/40"
                      }`}
                    >
                      Cerrado
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>
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
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-black/30 mx-auto mb-4" />
              <p className="text-black/60 font-bold uppercase text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 border-2 border-black/10 p-3 bg-white"
                  >
                    <div className="flex-shrink-0 w-16 h-16 overflow-hidden border-2 border-black/10">
                      {(item.product_images?.[0]?.url || item.image_url) && (
                        <img
                          src={item.product_images?.[0]?.url || item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black uppercase text-sm text-black">{item.name}</h4>
                      {item.selectedSize && (
                        <p className="text-xs text-black/60">
                          Tamaño: {item.selectedSize.name}
                        </p>
                      )}
                      {item.selectedAddons.length > 0 && (
                        <p className="text-xs text-black/60">
                          Adicionales: {item.selectedAddons.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      <p className="mt-1 text-black font-black">
                        {formatCurrency(item.itemTotal)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(index, -1)}
                        className="w-8 h-8 rounded-full border-2 border-black/20 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-black text-black">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(index, 1)}
                        className="w-8 h-8 rounded-full border-2 border-black/20 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(index)}
                        className="w-8 h-8 rounded-full text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black pt-4">
                <div className="flex justify-between text-xl font-black uppercase text-black mb-4">
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
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const deliveryEnabled = settings?.delivery_enabled ?? true;
  const pickupEnabled = settings?.pickup_enabled ?? true;

  const availableTypes = useMemo<{ value: "delivery" | "pickup"; label: string }[]>(() => {
    const types: { value: "delivery" | "pickup"; label: string }[] = [];
    if (deliveryEnabled) types.push({ value: "delivery", label: "Domicilio" });
    if (pickupEnabled) types.push({ value: "pickup", label: "Recoger en tienda" });
    if (types.length === 0) types.push({ value: "delivery", label: "Domicilio" });
    return types;
  }, [deliveryEnabled, pickupEnabled]);

  const availableTypeKeys = availableTypes.map((t) => t.value).join(",");
  useEffect(() => {
    if (!availableTypes.some((t) => t.value === orderType)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderType(availableTypes[0]?.value ?? "delivery");
    }
  }, [orderType, availableTypeKeys, availableTypes]);

  useEffect(() => {
    if (orderType !== "delivery") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeliveryCoords(null);
    }
  }, [orderType]);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuccess(false);
      setLoading(false);
      setDeliveryCoords(null);
      setLocError("");
      setPaymentMethod("cash");
      setCashAmount("");
    }
  }, [isOpen]);

   const shareLocation = async () => {
    setLocError("");
    if (!window.isSecureContext) {
      setLocError("La ubicación requiere HTTPS. Escribe la dirección manualmente.");
      return;
    }
    if (!navigator.geolocation) {
      setLocError("Tu navegador no soporta geolocalización");
      return;
    }
    try {
      const nav = navigator as Navigator & { permissions?: { query: (p: { name: string }) => Promise<{ state: string }> } };
    const perm = await nav.permissions?.query?.({ name: "geolocation" });
      if (perm && perm.state === "denied") {
        setLocError("Permiso bloqueado. Habilítalo en la configuración del sitio y vuelve a intentar, o escribe la dirección.");
        return;
      }
    } catch {
      // Permissions API not supported; continue
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setDeliveryCoords({ lat, lng });
        } else {
          setLocError("Ubicación inválida");
        }
        setLocating(false);
      },
      (err) => {
        if (err.code === 1) {
          setLocError("Permiso denegado. Habilítalo en el navegador o escribe la dirección.");
        } else if (err.code === 2) {
          setLocError("No se pudo determinar la posición. Escribe la dirección.");
        } else {
          setLocError("Tiempo de espera agotado. Intenta de nuevo o escribe la dirección.");
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const total = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!customerName.trim()) {
      toast.error("Ingresa tu nombre");
      return;
    }

    if (!isValidPhone(customerPhone)) {
      toast.error("Ingresa un número de teléfono válido de 10 dígitos");
      return;
    }

    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Ingresa tu dirección de domicilio");
      return;
    }

    if (paymentMethod === "cash") {
      const amount = Number(cashAmount);
      if (!cashAmount || !Number.isFinite(amount) || amount < total) {
        toast.error("El monto en efectivo debe ser mayor o igual al total");
        return;
      }
    }

    setLoading(true);

    const orderData = {
      restaurant_id: restaurantId,
      order_type: orderType,
      delivery_address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
      delivery_latitude: orderType === "delivery" && deliveryCoords ? deliveryCoords.lat : undefined,
      delivery_longitude: orderType === "delivery" && deliveryCoords ? deliveryCoords.lng : undefined,
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
      payment_method: paymentMethod,
      cash_received: paymentMethod === "cash" && cashAmount ? Number(cashAmount) : undefined,
      change_due:
        paymentMethod === "cash" && cashAmount
          ? Math.max(0, Number(cashAmount) - total)
          : undefined,
    };

    const { error: orderError } = await createOrder(orderData);

    if (!orderError) {
      toast.success("¡Pedido realizado con éxito!");
      setSuccess(true);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setDeliveryCoords(null);
      setLocError("");
      setNotes("");
      setOrderType(availableTypes[0].value);
      setPaymentMethod("cash");
      setCashAmount("");
    } else {
      setLoading(false);
      toast.error(orderError?.message || "No se pudo realizar el pedido");
    }
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="" size="md" contentClassName="p-0" showCloseButton={false}>
        <div className="relative overflow-hidden bg-black text-white">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-yellow-400/20 blur-2xl" />
          <div className="relative flex flex-col items-center gap-4 p-8 text-center">
            <img
              src="/assets/brand/mascota en blanco.png"
              alt="Mascota"
              className="h-24 w-24 object-contain drop-shadow-[0_8px_24px_rgba(250,204,21,0.35)]"
            />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Pedido confirmado</p>
              <h3 className="text-2xl font-black uppercase leading-none">¡Todo listo!</h3>
            </div>
            <p className="max-w-xs text-sm text-white/70">
              Tu pedido ha sido enviado. El restaurante lo preparará en breve. Te contactaremos por WhatsApp.
            </p>
            <div className="w-full border-t-2 border-yellow-400/30 pt-5">
              <Button onClick={() => { onSuccess(); window.scrollTo({ top: 0, behavior: 'smooth' }); const el = document.querySelector('.mono-interface'); if (el) (el as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' }); }} fullWidth size="lg">
                OK, entendido
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar pedido" size="lg" position="bottom" showCloseButton={false} contentClassName="p-0">
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">

        {/* Tipo de pedido */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-black mb-3">
            Tipo de pedido
          </label>
          <div className={`grid gap-3 ${availableTypes.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {availableTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setOrderType(type.value)}
                className={`p-3 border-2 text-xs font-black uppercase tracking-wide transition-all ${
                  orderType === type.value
                    ? "border-black bg-black text-white"
                    : "border-black/20 hover:border-black"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dirección de domicilio */}
        {orderType === "delivery" && (
          <div className="space-y-2">
            <Input
              label="Dirección de domicilio"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
               placeholder="Referencia, barrio, puntos de referencia..."
          required
          helperText="Usaremos esto para contactarte sobre tu pedido"
        />
            <button
              type="button"
              onClick={shareLocation}
              disabled={locating}
              className="w-full border-2 border-black bg-yellow-400 text-black font-black uppercase text-xs py-2 px-3 hover:bg-black hover:text-yellow-400 transition-all disabled:opacity-60"
            >
              {locating ? "Obteniendo ubicación..." : "Compartir mi ubicación"}
            </button>
            {locError && <p className="text-xs text-red-600">{locError}</p>}
            {deliveryCoords && (
              <div className="space-y-2">
                <p className="text-xs text-green-700">
                  Ubicación obtenida
                  <button type="button" onClick={shareLocation} className="ml-2 underline">Actualizar</button>
                </p>
                <div className="overflow-hidden border-2 border-black">
                  <iframe
                    title="Mapa de tu ubicación"
                    src={`https://www.google.com/maps?q=${deliveryCoords.lat},${deliveryCoords.lng}&output=embed`}
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>
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
          onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Número de celular de 10 dígitos"
          maxLength={10}
          inputMode="numeric"
          required
        />

        {/* Instrucciones especiales */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-black mb-2">
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

        {/* Método de pago */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-black mb-2">
            Método de pago
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`p-3 border-2 text-xs font-black uppercase tracking-wide transition-all ${
                paymentMethod === "cash"
                  ? "border-black bg-black text-white"
                  : "border-black/20 hover:border-black"
              }`}
            >
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("transfer")}
              className={`p-3 border-2 text-xs font-black uppercase tracking-wide transition-all ${
                paymentMethod === "transfer"
                  ? "border-black bg-black text-white"
                  : "border-black/20 hover:border-black"
              }`}
            >
              Transferencia
            </button>
          </div>
        </div>

        {paymentMethod === "cash" && (
          <div className="space-y-2">
            <Input
              label="¿Con cuánto pagas?"
              type="text"
              inputMode="numeric"
              value={cashAmount ? formatCurrency(Number(cashAmount)) : ""}
              onChange={(e) => setCashAmount(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder={formatCurrency(total)}
              required
            />
            {Number(cashAmount) > 0 && Number(cashAmount) >= total && (
              <p className="text-xs font-bold text-black/70">
                Cambio: {formatCurrency(Math.max(0, Number(cashAmount) - total))}
              </p>
            )}
          </div>
        )}

        {/* Resumen */}
        <div className="bg-black text-white p-4 space-y-1.5 border-2 border-black">
          <h4 className="font-black uppercase text-xs mb-2 text-yellow-400">Resumen del pedido</h4>
          {cart.map((item, index) => (
            <div key={index} className="space-y-0.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">
                  {item.quantity}x {item.name}
                  {item.selectedSize && ` (${item.selectedSize.name})`}
                </span>
                <span className="text-white font-bold">
                  {formatCurrency(item.itemTotal * item.quantity)}
                </span>
              </div>
              {item.selectedAddons && item.selectedAddons.length > 0 && (
                <div className="pl-3 text-xs text-white/50">
                  + {item.selectedAddons.map((a) => a.name).join(", ")}
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-white/20 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xl font-black uppercase text-white pt-2 border-t border-white/20">
              <span>Total</span>
              <span className="text-yellow-400">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth size="sm">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} loadingText="Procesando pedido..." fullWidth>
            Realizar pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
