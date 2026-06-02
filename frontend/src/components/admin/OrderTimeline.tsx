"use client";
import React from "react";

type Event = { status: string; message: string; timestamp: string };

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out-for-delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderTimeline({ currentStatus, events }: { currentStatus: string; events: Event[] }) {
  const activeIndex = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, idx) => {
          const active = idx <= activeIndex;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-sky-950 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {idx + 1}
              </div>
              <span className={`text-xs uppercase tracking-[0.24em] ${active ? 'text-slate-950' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {events && events.length ? (
          events.map((ev, i) => (
            <div key={i} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-slate-950">{ev.status}</span>
                <span className="text-xs text-slate-500">{new Date(ev.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{ev.message}</p>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-slate-600">No tracking events yet.</div>
        )}
      </div>
    </div>
  );
}
