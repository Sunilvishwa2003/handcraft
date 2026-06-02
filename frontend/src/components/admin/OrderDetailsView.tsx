"use client";
import React, { useEffect, useState } from "react";
import { Order } from "../../lib/types";
import { apiFetch, formatPrice, getCartItemImageUrl } from "../../lib/api";
import OrderTimeline from "./OrderTimeline";
import Invoice from "./Invoice";
import TelegramTestButton from "./TelegramTestButton";

type Props = { orderId: string };

export default function OrderDetailsView({ orderId }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    apiFetch<Order>(`/admin/orders/${orderId}`)
      .then((data) => {
        setOrder(data);
        setStatus(data.status || "");
      })
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  }, [orderId]);

  const updateStatus = async () => {
    try {
      setLoading(true);
      const updated = await apiFetch<Order>(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, message }),
      });
      setOrder(updated);
      setMessage("");
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Loading order…</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Error: {error}</div>;
  }

  if (!order) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Order not found.</div>;
  }

  const subtotal = order.orderItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Order details</h2>
              <p className="mt-1 text-sm text-slate-600">Order #{order._id}</p>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm text-slate-500">Status</p>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{order.status}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Customer</h3>
              <p className="mt-2 text-sm text-slate-600">{order.user?.name || "Guest"}</p>
              <p className="text-sm text-slate-600">{order.user?.email || "-"}</p>
              <p className="text-sm text-slate-600">{order.shippingAddress?.phone || "-"}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Shipping address</h3>
              <p className="mt-2 text-sm text-slate-600">{order.shippingAddress.address}</p>
              <p className="text-sm text-slate-600">{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
              <p className="text-sm text-slate-600">{order.shippingAddress.country}</p>
              {order.estimatedDelivery ? (
                <div className="mt-4 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  <p className="font-semibold text-slate-900">Estimated delivery</p>
                  <p>{order.estimatedDelivery}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-950">Items</h2>
            <span className="text-sm text-slate-500">{order.orderItems.length} products</span>
          </div>

          <div className="mt-5 space-y-4">
            {order.orderItems.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img src={getCartItemImageUrl(item.image)} alt={item.name} className="h-20 w-20 rounded-3xl object-cover" />
                  <div>
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="text-sm text-slate-600">Qty: {item.qty}</p>
                    <p className="text-sm text-slate-600">{formatPrice(item.price)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Line total</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{formatPrice(item.price * item.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span>{formatPrice(order.discountPrice)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-950">
              <span>Grand total</span>
              <span>{formatPrice(order.totalPrice)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Payment</h2>
              <p className="mt-3 text-sm text-slate-600">Method: {order.paymentMethod}</p>
              <p className="mt-1 text-sm text-slate-600">Status: {order.isPaid ? `Paid at ${order.paidAt}` : 'Not paid'}</p>
              {order.isDelivered ? (
                <p className="mt-1 text-sm text-slate-600">Delivered at: {order.deliveredAt || 'Delivered'}</p>
              ) : null}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
              <p className="mt-3 text-sm text-slate-600">Review the order status history below.</p>
            </div>
          </div>

          <div className="mt-6">
            <OrderTimeline currentStatus={order.status} events={order.trackingEvents} />
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Admin actions</h2>
          <p className="mt-2 text-sm text-slate-600">Update order status quickly and notify the customer.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">Order status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
              >
                <option value="placed">Placed</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="out-for-delivery">Out For Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
              />
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={updateStatus}
                disabled={loading}
                className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating…" : "Update order status"}
              </button>
              <Invoice order={order} />
              <TelegramTestButton orderId={order._id} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
