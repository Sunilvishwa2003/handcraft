"use client";

import { useMemo, useSyncExternalStore } from "react";
import { normalizeUserAdminState } from "@/lib/isAdmin";
import { User } from "@/lib/types";

const subscribeToStoredUser = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
};

const getStoredUserSnapshot = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("commerceUser");
};

export function useStoredUser() {
  const storedUser = useSyncExternalStore(subscribeToStoredUser, getStoredUserSnapshot, () => null);

  return useMemo(() => {
    if (!storedUser) {
      return null;
    }

    try {
      return normalizeUserAdminState(JSON.parse(storedUser) as User);
    } catch {
      return null;
    }
  }, [storedUser]);
}
