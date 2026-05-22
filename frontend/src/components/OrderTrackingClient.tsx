"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { useStoredUser } from "@/hooks/useStoredUser";
import { apiFetch, formatPrice, getCartItemImageUrl, getSocketUrl, setStoredUser } from "@/lib/api";
import { launchRazorpayCheckout } from "@/lib/razorpay";
import { Order } from "@/lib/types";

const trackingSteps = ["Ordered", "Packed", "Shipped", "Delivered"] as const;

const formatFriendlyDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not available";

const formatStatus = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatPaymentChannel = (value?: string) => {
  if (!value) {
    return "";
  }

  if (value === "upi") return "UPI";
  if (value === "netbanking") return "Net Banking";
  if (value === "card") return "Card";
  if (value === "wallet") return "Wallet";

  return formatStatus(value);
};

const getPaymentLabel = (order: Order) => {
  if (order.paymentMethod === "cod") {
    return order.isPaid ? "Paid on delivery" : "Cash on delivery";
  }

  if (order.isPaid) {
    return order.paymentResult?.method ? `Paid via ${formatPaymentChannel(order.paymentResult.method)}` : "Paid online";
  }

  return order.paymentMethod === "razorpay" ? "Razorpay pending" : "Payment pending";
};

const getTrackingStepIndex = (status: string) => {
  if (status === "delivered") {
    return 3;
  }

  if (["shipped", "out-for-delivery"].includes(status)) {
    return 2;
  }

  if (status === "packed") {
    return 1;
  }

  return 0;
};

const getDeliveryLabel = (order: Order) => {
  if (order.status === "cancelled") {
    return "Cancelled";
  }

  if (order.isDelivered || order.status === "delivered") {
    return "Delivered";
  }

  if (["shipped", "out-for-delivery"].includes(order.status)) {
    return "In transit";
  }

  if (order.status === "packed") {
    return "Packed";
  }

  return "Preparing";
};

export default function OrderTrackingClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const sessionUser = useStoredUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isPayingNow, setIsPayingNow] = useState(false);

  const redirectTarget = `/orders/${orderId}`;

  useEffect(() => {
    if (!sessionUser?.token) {
      router.replace(`/account?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    let active = true;
    const socket = io(getSocketUrl());

    const loadOrder = async () => {
      setLoading(true);
      setMessage("");

      try {
        const nextOrder = await apiFetch<Order>(`/orders/${orderId}`);
        if (!active) {
          return;
        }

        setOrder(nextOrder);
      } catch (error) {
        const nextMessage = error instanceof Error ? error.message : "Could not load your order.";
        if (/not authorized|token|unauthorized/i.test(nextMessage)) {
          setStoredUser(null);
          router.replace(`/account?redirect=${encodeURIComponent(redirectTarget)}`);
          return;
        }

        if (active) {
          setMessage(nextMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    socket.emit("join:order", orderId);
    socket.on("order:update", (payload) => {
      setOrder((current) => (current ? { ...current, status: payload.status, trackingEvents: payload.trackingEvents } : current));
    });

    void loadOrder();

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [orderId, redirectTarget, router, sessionUser?.token]);

  const trackingStepIndex = useMemo(() => (order ? getTrackingStepIndex(order.status) : 0), [order]);

  const handlePayNow = async () => {
    if (!order) {
      return;
    }

    setMessage("");
    setIsPayingNow(true);

    try {
      const updatedOrder = await launchRazorpayCheckout({
        createOrderPayload: {
          existingOrderId: order._id,
        },
        verifyPayload: {
          existingOrderId: order._id,
        },
        customer: {
          name: order.user?.name || sessionUser?.name || "MahabsCrafto customer",
          email: order.user?.email || sessionUser?.email,
          contact: order.shippingAddress.phone,
        },
        description: `Balance payment for order ${order._id}`,
        dismissMessage: "Payment was cancelled before completion.",
      });
      setOrder(updatedOrder);
      setMessage("Payment completed successfully. Your order is now being processed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not process payment.");
    } finally {
      setIsPayingNow(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setMessage("");

    try {
      const updatedOrder = await apiFetch<Order>(`/orders/${order._id}/cancel`, {
        method: "POST",
      });
      setOrder(updatedOrder);
      setMessage("Order cancelled successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel this order.");
    }
  };

  if (loading) {
    return <OrderTrackingSkeleton />;
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-rose-100 bg-white p-6 text-sm text-rose-700 shadow-sm">
          {message || "Could not load this order."}
        </div>
      </main>
    );
  }

  const canCancel = !["shipped", "out-for-delivery", "delivered", "cancelled"].includes(order.status);
  const canPayNow = order.paymentMethod !== "cod" && !order.isPaid && order.status !== "cancelled";
  const itemCount = order.orderItems.reduce((sum, item) => sum + item.qty, 0);
  const estimatedDate =
    order.estimatedDelivery ||
    new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-white/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(3,105,161,0.92),rgba(12,74,110,0.92))] p-6 text-white shadow-[0_35px_110px_rgba(15,23,42,0.22)] md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link href="/account/dashboard?tab=orders" className="text-sm font-semibold text-sky-200 hover:text-white">
                Back to my orders
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Order details</p>
              <h1 className="mt-3 text-3xl font-semibold">Order {order._id}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/90">
                Track delivery progress, review payment and shipping details, and manage your order updates in real time.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard label="Order status" value={formatStatus(order.status)} />
              <SummaryCard label="Payment" value={getPaymentLabel(order)} />
              <SummaryCard label="Delivery" value={getDeliveryLabel(order)} />
            </div>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">{message}</div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <article className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Delivery progress</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Live status tracking</h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                  Expected by {formatFriendlyDate(estimatedDate)}
                </span>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {trackingSteps.map((step, index) => {
                  const active = order.status !== "cancelled" && index <= trackingStepIndex;
                  return (
                    <div
                      key={step}
                      className={`rounded-[24px] border px-4 py-4 ${
                        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">{step}</p>
                      <p className="mt-2 text-sm">{active ? "Completed" : "Waiting"}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 space-y-4">
                {order.trackingEvents.map((event, index) => (
                  <div key={`${event.status}-${index}`} className="grid grid-cols-[24px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <span className="h-3.5 w-3.5 rounded-full bg-sky-500" />
                      {index < order.trackingEvents.length - 1 ? <span className="mt-2 h-full w-px bg-slate-200" /> : null}
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="font-semibold text-slate-950">{formatStatus(event.status)}</p>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{formatFriendlyDate(event.timestamp)}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{event.message}</p>
                      {event.location ? <p className="mt-2 text-sm text-slate-500">Location: {event.location}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Shipping details</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoCard label="Delivery address">
                  <p>{order.shippingAddress.address}</p>
                  <p>
                    {order.shippingAddress.city} - {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </InfoCard>
                <InfoCard label="Contact and payment">
                  <p>{order.shippingAddress.phone || "Phone number not available"}</p>
                  <p>Method: {order.paymentMethod === "razorpay" ? "Razorpay" : formatStatus(order.paymentMethod)}</p>
                  <p>Status: {getPaymentLabel(order)}</p>
                </InfoCard>
              </div>
            </article>
          </section>

          <aside className="space-y-6">
            <article className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Order summary</p>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <SummaryRow label="Items" value={String(itemCount)} />
                <SummaryRow label="Subtotal" value={formatPrice(order.totalPrice - order.shippingPrice - order.taxPrice + order.discountPrice)} />
                <SummaryRow label="Shipping" value={formatPrice(order.shippingPrice)} />
                <SummaryRow label="Tax" value={formatPrice(order.taxPrice)} />
                <SummaryRow label="Discount" value={order.discountPrice ? `- ${formatPrice(order.discountPrice)}` : formatPrice(0)} />
                <SummaryRow label="Total" value={formatPrice(order.totalPrice)} emphasized />
              </div>

              <div className="mt-6 space-y-3">
                {canPayNow ? (
                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={isPayingNow}
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {isPayingNow ? "Opening Razorpay..." : "Pay now"}
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5"
                  >
                    Cancel order
                  </button>
                ) : null}
              </div>

              <div className="mt-5 rounded-[24px] bg-slate-50/90 p-4 text-sm text-slate-600">
                Fraud score {order.fraudRiskScore}/100
                {order.fraudFlags.length ? ` · ${order.fraudFlags.join(", ")}` : " · No active flags"}
              </div>
            </article>

            <article className="rounded-[32px] border border-white/60 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Items in this order</p>
              <div className="mt-5 space-y-4">
                {order.orderItems.map((item) => (
                  <div key={`${order._id}-${item.product}`} className="flex gap-4 rounded-[24px] bg-slate-50/90 p-4">
                    <div className="h-20 w-20 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-2">
                      <img
                        src={getCartItemImageUrl(item.image)}
                        alt={item.name}
                        className="h-full w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = "/mahabs-logo.svg";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Qty {item.qty}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/90">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[24px] bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${emphasized ? "border-t border-slate-200 pt-3 text-base font-semibold text-slate-950" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function OrderTrackingSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-56 animate-pulse rounded-[36px] bg-slate-200" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="h-96 animate-pulse rounded-[32px] bg-slate-200" />
            <div className="h-52 animate-pulse rounded-[32px] bg-slate-200" />
          </div>
          <div className="space-y-6">
            <div className="h-72 animate-pulse rounded-[32px] bg-slate-200" />
            <div className="h-96 animate-pulse rounded-[32px] bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
