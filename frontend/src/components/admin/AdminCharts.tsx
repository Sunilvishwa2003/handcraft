"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { formatPrice } from "@/lib/api";
import { type AdminBarPoint, type AdminHeatmapRow, type AdminPiePoint, type AdminSeriesPoint } from "@/lib/admin/types";

const tooltipStyle = {
  backgroundColor: "rgba(15, 18, 24, 0.96)",
  border: "1px solid rgba(217, 177, 111, 0.16)",
  borderRadius: "18px",
  color: "#f7f3eb",
};

export function RevenueAreaChart({ data }: { data: AdminSeriesPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#d9b16f" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#d9b16f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#b9afa2", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#b9afa2", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [formatPrice(Number(value ?? 0)), "Revenue"]} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="sales" stroke="#d9b16f" fill="url(#salesGradient)" strokeWidth={3} activeDot={{ r: 6, fill: "#d9b16f" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data }: { data: AdminPiePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={64} outerRadius={92} paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, _name, payload) => [Number(value ?? 0), String(payload?.payload?.name || "")]} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChannelBarChart({ data }: { data: AdminBarPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, right: 12, top: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#b9afa2", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#b9afa2", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value, _name, payload) => [Number(value ?? 0), String(payload?.payload?.name || "")]} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[18, 18, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelBarChart({ data }: { data: AdminBarPoint[] }) {
  return (
    <div className="space-y-4">
      {data.map((item) => {
        const max = Math.max(...data.map((point) => point.value), 1);
        const width = `${Math.max(12, Math.round((item.value / max) * 100))}%`;

        return (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[var(--admin-muted)]">{item.name}</span>
              <span className="font-semibold text-[var(--admin-foreground)]">{item.value}</span>
            </div>
            <div className="h-3 rounded-full bg-white/8">
              <div className="h-3 rounded-full transition-all duration-500" style={{ width, backgroundColor: item.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeatmapGrid({ rows }: { rows: AdminHeatmapRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-2">
          <span className="self-center text-xs uppercase tracking-[0.2em] text-[var(--admin-muted)]">{row.label}</span>
          {row.cells.map((cell) => (
            <div
              key={`${row.label}-${cell.label}`}
              className="group relative flex h-10 items-center justify-center rounded-2xl border border-white/5 text-[11px] font-semibold text-[var(--admin-foreground)]"
              style={{
                backgroundColor: `rgba(217,177,111,${0.08 + cell.intensity * 0.52})`,
              }}
            >
              {cell.value}
              <span className="pointer-events-none absolute -top-8 rounded-full bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {cell.label}: {cell.value} orders
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
