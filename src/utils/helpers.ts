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
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export interface StoredRestaurantUser {
  restaurant_id?: string;
}

export const getStoredRestaurantUser = (): StoredRestaurantUser => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return {};

  try {
    const user: unknown = JSON.parse(rawUser);
    if (!user || typeof user !== "object") return {};
    const restaurantId = (user as { restaurant_id?: unknown }).restaurant_id;
    return typeof restaurantId === "string" ? { restaurant_id: restaurantId } : {};
  } catch {
    return {};
  }
};

export const getStoredRestaurantId = (): string | undefined =>
  getStoredRestaurantUser().restaurant_id;

/**
 * Play notification sound
 */
export const playSound = async (_type?: string): Promise<boolean> => {
  void _type;
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
