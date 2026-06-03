"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Order } from "../../lib/types";
import { apiFetch, formatPrice } from "../../lib/api";

const statusOptions = [
  "",
  "pending",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

const sortOptions = [
  { value: "createdAt", label: "Date" },
  { value: "totalPrice", label: "Amount" },
  { value: "status", label: "Status" },
];

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<{
        orders: Order[];
        page: number;
        pages: number;
        pageSize: number;
        total: number;
      }>(`/admin/orders?page=${page}&pageSize=${pageSize}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(query)}&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`);
      setOrders(payload.orders);
      setPage(payload.page);
      setPages(payload.pages);
      setTotal(payload.total);
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, sortBy, sortOrder, query]);

  const summaryText = useMemo(() => {
    if (loading) return "Loading orders…";
    return `${total} order${total === 1 ? "" : "s"}`;
  }, [loading, total]);

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <label className="block text-sm font-semibold text-slate-900">Search</label>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && setQuery(search.trim())}
            placeholder="Order ID, customer, phone, payment"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
          >
            <option value="">All statuses</option>
            {statusOptions.filter(Boolean).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">Sort by</label>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">Order</label>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

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
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                  {loading ? 'Loading orders…' : 'No orders found.'}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-medium text-slate-900">{order.orderId || order._id}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>{summaryText}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page <= 1}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, pages))}
            disabled={page >= pages}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <span className="self-center text-slate-500">Page {page} of {pages}</span>
        </div>
      </div>
    </div>
  );
}
