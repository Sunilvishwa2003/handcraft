"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { buildAdminSnapshot } from "@/lib/admin/dashboard";
import { type AnalyticsApiResponse, type DashboardApiResponse } from "@/lib/admin/types";
import { type CustomProject, type NotificationItem, type Order, type User } from "@/lib/types";

const fetchAdminSnapshot = async () => {
  try {
    const [dashboard, analytics, orders, customOrders, notifications] = await Promise.allSettled([
      apiFetch<DashboardApiResponse>("/admin/dashboard"),
      apiFetch<AnalyticsApiResponse>("/admin/analytics"),
      apiFetch<Order[]>("/admin/orders"),
      apiFetch<CustomProject[]>("/custom-orders"),
      apiFetch<NotificationItem[]>("/notifications"),
    ]);

    return buildAdminSnapshot({
      dashboard: dashboard.status === "fulfilled" ? dashboard.value : undefined,
      analytics: analytics.status === "fulfilled" ? analytics.value : undefined,
      orders: orders.status === "fulfilled" ? orders.value : [],
      customOrders: customOrders.status === "fulfilled" ? customOrders.value : [],
      notifications: notifications.status === "fulfilled" ? notifications.value : [],
    });
  } catch (error) {
    console.error("Admin snapshot build failed", error);

    return buildAdminSnapshot({
      dashboard: undefined,
      analytics: undefined,
      orders: [],
      customOrders: [],
      notifications: [],
    });
  }
};

export function useAdminDashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const query = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminSnapshot,
    enabled: Boolean(user?.isAdmin),
  });

  return {
    ...query,
    user,
    isAuthorized: Boolean(user?.isAdmin),
  };
}
