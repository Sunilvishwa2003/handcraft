"use client";
import React from "react";
import OrdersTable from "../../../components/admin/OrdersTable";
import AdminGuard from "../../../components/admin/AdminGuard";

export default function AdminOrdersPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
              <p className="mt-1 text-sm text-slate-600">Review the latest orders placed on your store.</p>
            </div>
          </div>
        </div>

        <AdminGuard>
          <OrdersTable />
        </AdminGuard>
      </div>
    </main>
  );
}
