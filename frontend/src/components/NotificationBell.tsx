"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { NotificationItem, User } from "@/lib/types";

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

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const storedUser = useSyncExternalStore(subscribeToStoredUser, getStoredUserSnapshot, () => null);
  const user = useMemo<User | null>(() => {
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      window.localStorage.removeItem("commerceUser");
      return null;
    }
  }, [storedUser]);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.token) {
      return;
    }

    apiFetch<NotificationItem[]>("/notifications").then(setItems).catch(() => undefined);
    const socket = io(getSocketUrl());
    socket.emit("join:user", user._id);
    socket.on("notification", (notification: NotificationItem) => {
      setItems((current) => [notification, ...current]);
    });
    socket.on("order:update", (payload) => {
      setItems((current) => [
        {
          _id: `socket-${Date.now()}`,
          title: "Order update",
          message: `Order ${payload.orderId} is ${payload.status}.`,
          type: "order",
          read: false,
          data: payload,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id, user?.token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const unread = items.filter((item) => !item.read).length;

  const formatTime = (dateString?: string) => {
    if (!dateString) {
      return "Just now";
    }
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const typeStyles = (type?: string) => {
    switch (type) {
      case "order":
        return "bg-sky-100 text-sky-700";
      case "project":
        return "bg-amber-100 text-amber-800";
      case "chat":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (!user?.token) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        Alerts
        {unread ? <span className="rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-slate-950">{unread}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[22rem] min-w-[20rem] overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-[0_30px_60px_rgba(15,23,42,0.2)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">Recent activity from your orders and studio updates</p>
            </div>
            {unread ? (
              <button
                type="button"
                onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto p-3">
            {items.length ? (
              items.map((item) => (
                <div
                  key={item._id}
                  className={`group rounded-[22px] border p-4 transition ${item.read ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50/80 hover:bg-sky-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${typeStyles(item.type)}`}>
                      {item.type || "Alert"}
                    </span>
                    <span className="text-[11px] text-slate-500">{formatTime(item.createdAt)}</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-950">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
