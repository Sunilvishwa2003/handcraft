"use client";
import React from "react";
import OrderDetailsView from "../../../../components/admin/OrderDetailsView";
import AdminGuard from "../../../../components/admin/AdminGuard";

type Props = {
  params: { id: string };
};

export default function OrderDetailsPage({ params }: Props) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Order Details</h1>
          <p className="mt-2 text-sm text-slate-600">Manage order status, tracking, and invoice generation.</p>
        </div>

        <AdminGuard>
          <OrderDetailsView orderId={params.id} />
        </AdminGuard>
      </div>
    </main>
  );
}
