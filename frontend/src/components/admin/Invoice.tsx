"use client";
import React, { useRef } from "react";
import { Order } from "../../lib/types";
import { formatPrice, getCartItemImageUrl } from "../../lib/api";

export default function Invoice({ order }: { order: Order }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const print = () => {
    const printContents = ref.current?.innerHTML || "";
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><title>Invoice</title><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body>${printContents}</body></html>`);
    popup.document.close();
    setTimeout(() => popup.print(), 250);
  };

  const subtotal = order.orderItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={print}
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Print Invoice
      </button>
      <div className="hidden" aria-hidden>
        <div ref={ref} style={{ padding: 24, fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', width: 800 }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Invoice</div>
              <div style={{ fontSize: 14, color: '#334155' }}>Order ID: {order._id}</div>
              <div style={{ fontSize: 14, color: '#334155' }}>Date: {new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Customer</div>
              <div>{order.user?.name}</div>
              <div>{order.user?.email}</div>
            </div>
          </div>

          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 10 }}>Item</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 10 }}>Qty</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 10 }}>Price</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 10 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={getCartItemImageUrl(it.image)} alt={it.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 12 }} />
                      <div style={{ fontSize: 14, color: '#0f172a' }}>{it.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{it.qty}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{formatPrice(it.price)}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{formatPrice(it.qty * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#475569' }}>Subtotal</div>
              <div style={{ fontWeight: 700 }}>{formatPrice(subtotal)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#475569' }}>Shipping</div>
              <div style={{ fontWeight: 700 }}>{formatPrice(order.shippingPrice)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#475569' }}>Grand Total</div>
              <div style={{ fontWeight: 700 }}>{formatPrice(order.totalPrice)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
