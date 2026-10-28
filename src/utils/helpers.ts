import { APP_CONFIG } from "../config/config";

/**
 * Format currency value
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "$0";
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Generate unique slug from restaurant name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

/**
 * Generate a fallback order number. Supabase generates the final number
 * through the orders trigger, which guarantees sequencing per restaurant.
 */
export const generateOrderNumber = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 5 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  ).join("");
  return `${APP_CONFIG.orderPrefix}-${suffix}`;
};

/**
 * Generate temporary password
 */
export const generateTempPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Calculate order totals
 */
export const calculateOrderTotals = (items: unknown[]) => {
  const subtotal = items.reduce((sum: number, item) => sum + (item as { item_total: number }).item_total, 0);
  const total = subtotal;

  return { subtotal, total };
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate phone number (Colombian format: starts with 3, 10 digits)
 */
export const isValidPhone = (phone: string): boolean => {
  const re = /^3\d{9}$/;
  return re.test(phone);
};

export const normalizePhoneInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 10);

/**
 * Hash password using SHA-256
 * Works on both HTTP and HTTPS (mobile and desktop)
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Use crypto-js for consistent hashing across all platforms
  const CryptoJS = (await import("crypto-js")).default;
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const statusConfig =
    APP_CONFIG.orderStatuses[status as keyof typeof APP_CONFIG.orderStatuses];
  return statusConfig?.color || "neutral";
};

/**
 * Calculate item price with size and addons
 */
export const calculateItemPrice = (
  basePrice: number,
  selectedSize?: { price: number },
  selectedAddons?: { price: number }[]
): number => {
  let price = selectedSize ? selectedSize.price : basePrice;
  if (selectedAddons && selectedAddons.length > 0) {
    price += selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  }
  return price;
};

/**
 * Download file
 */
export const downloadFile = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Play notification sound
 */
export const playNotificationSound = async (): Promise<boolean> => {
  try {
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const startTime = audioContext.currentTime;
    const notes = [
      { frequency: 659.25, offset: 0, duration: 0.16 },
      { frequency: 783.99, offset: 0.12, duration: 0.16 },
      { frequency: 987.77, offset: 0.24, duration: 0.28 },
    ];

    notes.forEach(({ frequency, offset, duration }) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = startTime + offset;
      const noteEnd = noteStart + duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.34, noteStart + 0.015);
      gain.gain.setValueAtTime(0.34, noteEnd - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
    });

    window.setTimeout(() => {
      void audioContext.close();
    }, 650);
    return true;
  } catch (error) {
    console.warn("Notification sound could not be played:", error);
    return false;
  }
};

/**
 * Play sound (alias for playNotificationSound)
 */
export const playSound = (_type?: string) => {
  void _type;
  return playNotificationSound();
};
