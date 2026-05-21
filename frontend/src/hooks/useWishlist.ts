"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { apiFetch, getStoredUser, WISHLIST_IDS_STORAGE_KEY } from "@/lib/api";
import { Product } from "@/lib/types";
import { useStoredUser } from "@/hooks/useStoredUser";

type WishlistProduct = Pick<Product, "_id">;

const listeners = new Set<() => void>();
let cachedWishlistIds: string[] | null = null;
let wishlistRequest: Promise<string[]> | null = null;

const readStoredWishlistIds = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WISHLIST_IDS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    window.localStorage.removeItem(WISHLIST_IDS_STORAGE_KEY);
    return [];
  }
};

const normalizeWishlistIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const emitWishlistChange = () => {
  listeners.forEach((listener) => listener());
};

const persistWishlistIds = (ids: string[]) => {
  cachedWishlistIds = normalizeWishlistIds(ids);

  if (typeof window !== "undefined") {
    if (cachedWishlistIds.length) {
      window.localStorage.setItem(WISHLIST_IDS_STORAGE_KEY, JSON.stringify(cachedWishlistIds));
    } else {
      window.localStorage.removeItem(WISHLIST_IDS_STORAGE_KEY);
    }
  }

  emitWishlistChange();
};

const getWishlistSnapshot = () => {
  if (cachedWishlistIds === null) {
    cachedWishlistIds = readStoredWishlistIds();
  }

  return cachedWishlistIds;
};

const subscribeToWishlist = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onStoreChange);
    };
  }

  const syncFromStorage = () => {
    cachedWishlistIds = readStoredWishlistIds();
    onStoreChange();
  };

  window.addEventListener("storage", syncFromStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", syncFromStorage);
  };
};

export const syncWishlistIds = (products: WishlistProduct[]) => {
  persistWishlistIds(products.map((product) => product._id));
};

export const refreshWishlistIds = async () => {
  const user = getStoredUser();
  if (!user?.token) {
    persistWishlistIds([]);
    return [];
  }

  if (wishlistRequest) {
    return wishlistRequest;
  }

  wishlistRequest = apiFetch<string[]>("/wishlist/ids")
    .then((ids) => {
      persistWishlistIds(ids);
      return ids;
    })
    .finally(() => {
      wishlistRequest = null;
    });

  return wishlistRequest;
};

export const toggleWishlistProduct = async (productId: string) => {
  const user = getStoredUser();
  if (!user?.token) {
    throw new Error("Login to save items to your wishlist.");
  }

  const previousIds = [...getWishlistSnapshot()];
  const alreadySaved = previousIds.includes(productId);
  const nextIds = alreadySaved ? previousIds.filter((id) => id !== productId) : [...previousIds, productId];

  persistWishlistIds(nextIds);

  try {
    const updatedWishlist = await apiFetch<WishlistProduct[]>(`/wishlist/${productId}`, {
      method: alreadySaved ? "DELETE" : "POST",
    });

    persistWishlistIds(updatedWishlist.map((product) => product._id));
    return !alreadySaved;
  } catch (error) {
    persistWishlistIds(previousIds);
    throw error;
  }
};

export function useWishlist(productId?: string) {
  const user = useStoredUser();
  const wishlistIds = useSyncExternalStore(subscribeToWishlist, getWishlistSnapshot, () => []);

  useEffect(() => {
    if (!user?.token) {
      if (wishlistIds.length) {
        persistWishlistIds([]);
      }
      return;
    }

    if (cachedWishlistIds === null || (!window.localStorage.getItem(WISHLIST_IDS_STORAGE_KEY) && !wishlistRequest)) {
      void refreshWishlistIds();
    }
  }, [user?._id, user?.token, wishlistIds.length]);

  const isWishlisted = useMemo(() => {
    if (!productId) {
      return false;
    }

    return wishlistIds.includes(productId);
  }, [productId, wishlistIds]);

  return {
    wishlistIds,
    isWishlisted,
    refreshWishlistIds,
    syncWishlistIds,
    toggleWishlistProduct,
  };
}
