import { Cart, Product, User, CartItem } from "./types";
import { normalizeUserAdminState } from "./isAdmin";

const DEFAULT_BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || "5001";
const DEFAULT_API_PATH = "/api";
export const PRODUCT_IMAGE_PLACEHOLDER = "/mahabs-logo.svg";
const SHIPPING_PRICE_PER_PRODUCT = 49;

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const WINDOWS_UPLOAD_PATH_PATTERN = /\/uploads\/.+$/i;
const BARE_DOMAIN_PATTERN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/.*)?$/i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getBrowserBackendOrigin = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

export const getApiUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  const browserOrigin = getBrowserBackendOrigin();
  if (browserOrigin) {
    return `${browserOrigin}${DEFAULT_API_PATH}`;
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}${DEFAULT_API_PATH}`;
};

export const getBackendUrl = () => trimTrailingSlash(getApiUrl().replace(/\/api\/?$/, ""));
export const getSocketUrl = () => getBackendUrl();

export const resolveAssetUrl = (url: string) => {
  const trimmed = url?.trim();
  if (!trimmed) {
    return "";
  }

  const backendUrl = getBackendUrl();

  const normalized = trimmed.replace(/\\/g, "/");
  const uploadPathMatch = normalized.match(WINDOWS_UPLOAD_PATH_PATTERN);

  if (uploadPathMatch) {
    return `${backendUrl}${encodeURI(uploadPathMatch[0])}`;
  }

  if (/^(data|blob):/i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    if (normalized.startsWith("/uploads/")) {
      return `${backendUrl}${encodeURI(normalized)}`;
    }

    return encodeURI(normalized);
  }

  if (normalized.startsWith("//")) {
    return encodeURI(`https:${normalized}`);
  }

  if (ABSOLUTE_URL_PATTERN.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      if (
        [parsed.hostname, parsed.hostname.replace(/^www\./i, "")]
          .filter(Boolean)
          .some((host) => ["localhost", "127.0.0.1", "0.0.0.0"].includes(host.toLowerCase())) &&
        parsed.pathname.startsWith("/uploads/")
      ) {
        return `${backendUrl}${encodeURI(parsed.pathname)}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return encodeURI(normalized);
    }

    return encodeURI(normalized);
  }

  if (BARE_DOMAIN_PATTERN.test(normalized)) {
    return encodeURI(`https://${normalized}`);
  }

  const relativePath = `/${normalized.replace(/^\.?\//, "").replace(/^\/+/, "")}`;
  return `${backendUrl}${encodeURI(relativePath)}`;
};

export type ProductImageSource = string | { url?: string; alt?: string };
type ProductImageCarrier = {
  image?: string | null;
  thumbnail?: string | null;
  imageUrl?: string | null;
  images?: ProductImageSource[] | null;
};

export const getProductImageUrl = (image?: ProductImageSource) => {
  if (!image) {
    return "";
  }

  if (typeof image === 'string') {
    return resolveAssetUrl(image.trim());
  }

  return image.url?.trim() ? resolveAssetUrl(image.url.trim()) : "";
};

export const getProductImageAlt = (image?: ProductImageSource, fallback = "") => {
  if (!image || typeof image === 'string') {
    return fallback;
  }

  return image.alt?.trim() || fallback;
};

export const getProductPrimaryImageUrl = (
  product?: ProductImageCarrier | null,
  fallback = PRODUCT_IMAGE_PLACEHOLDER,
) => {
  if (!product) {
    return fallback;
  }

  const candidates: Array<string | undefined> = [
    product.image?.trim() ? resolveAssetUrl(product.image.trim()) : "",
    ...(Array.isArray(product.images) ? product.images.map((image) => getProductImageUrl(image)) : []),
    product.thumbnail?.trim() ? resolveAssetUrl(product.thumbnail.trim()) : "",
    product.imageUrl?.trim() ? resolveAssetUrl(product.imageUrl.trim()) : "",
  ];

  return candidates.find(Boolean) || fallback;
};

export type CartItemImageSource = string | { url?: string | null } | null | undefined;

export const getCartItemImageUrl = (
  image?: CartItemImageSource,
  fallback = PRODUCT_IMAGE_PLACEHOLDER,
) => {
  const source =
    typeof image === 'string'
      ? image.trim()
      : image?.url?.trim()
      ? image.url.trim()
      : '';
  const resolved = source ? resolveAssetUrl(source) : "";
  return resolved || fallback;
};

export const isBackendAssetUrl = (url: string) => {
  if (!url) {
    return false;
  }
  const backendUrl = getBackendUrl();
  return url.startsWith(backendUrl) || url.startsWith("/");
};

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const isApproxPriceProduct = (product: Product | CartItem) =>
  Boolean(
    product.useApproxPrice &&
      typeof product.approxPriceMin === "number" &&
      typeof product.approxPriceMax === "number" &&
      product.approxPriceMax >= product.approxPriceMin,
  );

export const formatApproxPriceRange = (product: Product | CartItem) => {
  if (!isApproxPriceProduct(product)) {
    return "";
  }

  const min = product.approxPriceMin ?? 0;
  const max = product.approxPriceMax ?? 0;
  if (min === max) {
    return formatPrice(min);
  }

  return `${formatPrice(min)} - ${formatPrice(max)}`;
};

export const getProductEstimatePrice = (product: Product | CartItem) =>
  isApproxPriceProduct(product)
    ? Math.round(((product.approxPriceMin ?? 0) + (product.approxPriceMax ?? 0)) / 2)
    : product.price;

const RECENTLY_VIEWED_KEY = "recentlyViewedProducts";
const STORED_USER_KEY = "commerceUser";
export const WISHLIST_IDS_STORAGE_KEY = "commerceWishlistIds";
const BUY_NOW_CART_KEY = "commerceBuyNowCart";

export const getRecentlyViewed = (): Product[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    return stored ? (JSON.parse(stored) as Product[]) : [];
  } catch {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
    return [];
  }
};

export const addRecentlyViewed = (product: Product) => {
  if (typeof window === "undefined") {
    return;
  }

  const existing = getRecentlyViewed();
  const next = [product, ...existing.filter((item) => item._id !== product._id)].slice(0, 8);
  window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
};

export const getStoredUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORED_USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as User;
    const normalized = normalizeUserAdminState(parsed);

    if (normalized.isAdmin !== parsed.isAdmin) {
      window.localStorage.setItem(STORED_USER_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    window.localStorage.removeItem(STORED_USER_KEY);
    return null;
  }
};

export const setStoredUser = (user: User | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(STORED_USER_KEY);
    window.localStorage.removeItem(WISHLIST_IDS_STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("wishlist:changed"));
    return;
  }

  const normalizedUser = normalizeUserAdminState(user);

  const currentUser = getStoredUser();
  if (!currentUser || currentUser._id !== normalizedUser._id) {
    window.localStorage.removeItem(WISHLIST_IDS_STORAGE_KEY);
    window.dispatchEvent(new Event("wishlist:changed"));
  }

  window.localStorage.setItem(STORED_USER_KEY, JSON.stringify(normalizedUser));
  window.dispatchEvent(new Event("storage"));
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = getStoredUser();
  const headers = new Headers(options.headers);
  const apiUrl = getApiUrl();

  if (!(options.body instanceof FormData) && options.method !== "GET" && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  if (user?.token) {
    headers.set("Authorization", `Bearer ${user.token}`);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data as T;
}

export const getGuestCart = (): Cart => {
  if (typeof window === "undefined") {
    return { items: [], subtotal: 0, discountAmount: 0, total: 0 };
  }

  try {
    const raw = window.localStorage.getItem("guestCart");
    const parsedItems = raw ? (JSON.parse(raw) as unknown[]) : [];
    const items = Array.isArray(parsedItems)
      ? parsedItems.map((item) => {
          const cartItem = item as Partial<Cart["items"][number]>;
          const imageValue = cartItem.image;
          const normalizedImage =
            typeof imageValue === "string"
              ? imageValue.trim()
              : typeof imageValue === "object" && imageValue !== null && typeof (imageValue as any).url === "string"
              ? (imageValue as any).url.trim()
              : "";

          return {
            product: String(cartItem.product || ""),
            name: String(cartItem.name || ""),
            image: normalizedImage || PRODUCT_IMAGE_PLACEHOLDER,
            price: Number(cartItem.price || 0),
            qty: Number(cartItem.qty || 0),
            countInStock: Number(cartItem.countInStock || 0),
            useApproxPrice: Boolean(cartItem.useApproxPrice),
            approxPriceMin: typeof cartItem.approxPriceMin === "number" ? cartItem.approxPriceMin : undefined,
            approxPriceMax: typeof cartItem.approxPriceMax === "number" ? cartItem.approxPriceMax : undefined,
          };
        })
      : [];

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shippingPrice = items.reduce((sum, item) => sum + item.qty, 0) * SHIPPING_PRICE_PER_PRODUCT;

    return { items, subtotal, discountAmount: 0, total: subtotal + shippingPrice };
  } catch {
    window.localStorage.removeItem("guestCart");
    return { items: [], subtotal: 0, discountAmount: 0, total: 0 };
  }
};

export const setGuestCart = (items: Cart["items"]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("guestCart", JSON.stringify(items));
  window.dispatchEvent(new Event("cart:changed"));
};

export const getBuyNowCart = (): Cart | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BUY_NOW_CART_KEY);
    if (!raw) {
      return null;
    }

    const items = JSON.parse(raw) as Cart["items"];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shippingPrice = items.reduce((sum, item) => sum + item.qty, 0) * SHIPPING_PRICE_PER_PRODUCT;
    return { items, subtotal, discountAmount: 0, total: subtotal + shippingPrice };
  } catch {
    window.localStorage.removeItem(BUY_NOW_CART_KEY);
    return null;
  }
};

export const setBuyNowCart = (items: Cart["items"]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BUY_NOW_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:changed"));
};

export const clearBuyNowCart = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(BUY_NOW_CART_KEY);
  window.dispatchEvent(new Event("cart:changed"));
};

export const buildCartItemFromProduct = (product: Product, qty = 1): Cart["items"][number] => ({
  product: product._id,
  name: product.name,
  image: getProductPrimaryImageUrl(product),
  price: getProductEstimatePrice(product),
  qty,
  countInStock: product.countInStock,
  useApproxPrice: Boolean(product.useApproxPrice),
  approxPriceMin: product.approxPriceMin,
  approxPriceMax: product.approxPriceMax,
});
