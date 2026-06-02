"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Order } from "../../lib/types";
import { apiFetch, formatPrice } from "../../lib/api";

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiFetch<Order[]>("/admin/orders")
      .then((data) => {
        if (mounted) setOrders(data);
      })
      .catch((err) => {
        if (mounted) setError(String(err.message || err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Error: {error}</div>;
  }

  if (!orders) {
    return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Loading orders…</div>;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Order ID</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {orders.map((order) => (
            <tr key={order._id} className="hover:bg-slate-50">
              <td className="px-4 py-4 font-medium text-slate-900">{order._id}</td>
              <td className="px-4 py-4">{order.user?.name || "Guest"}</td>
              <td className="px-4 py-4">{order.user?.email || "-"}</td>
              <td className="px-4 py-4">{order.shippingAddress?.phone || "-"}</td>
              <td className="px-4 py-4 text-right font-semibold text-slate-900">{formatPrice(order.totalPrice)}</td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${order.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {order.isPaid ? "Paid" : "Pending"}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-4">{new Date(order.createdAt).toLocaleString()}</td>
              <td className="px-4 py-4">
                <Link href={`/admin/orders/${order._id}`} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
