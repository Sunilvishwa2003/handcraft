"use client";

import { useMemo } from "react";
import { Order } from "@/lib/types";

type ProjectAccuracyChartProps = {
  orders: Order[];
};

type AccuracyBreakdown = {
  accuracy: number;
  orderCount: number;
  fulfillmentScore: number;
  paidScore: number;
  trackingScore: number;
  fraudSafety: number;
};

type AccuracyPoint = AccuracyBreakdown & {
  dayLabel: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 7;
const ROLLING_WINDOW_DAYS = 7;
const STATUS_COMPLETION: Record<string, number> = {
  placed: 0.2,
  confirmed: 0.4,
  packed: 0.58,
  shipped: 0.76,
  "out-for-delivery": 0.9,
  delivered: 1,
  cancelled: 0,
};

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const formatDayLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const calculateAccuracy = (windowOrders: Order[]): AccuracyBreakdown | null => {
  if (!windowOrders.length) {
    return null;
  }

  const total = windowOrders.length;
  const fulfillmentScore =
    (windowOrders.reduce((sum, order) => sum + (STATUS_COMPLETION[order.status] ?? 0.15), 0) / total) * 100;
  const paidScore = (windowOrders.filter((order) => order.isPaid).length / total) * 100;
  const trackingScore = (windowOrders.filter((order) => order.trackingEvents.length > 0).length / total) * 100;
  const fraudSafety =
    windowOrders.reduce((sum, order) => sum + (100 - clamp(order.fraudRiskScore || 0, 0, 100)), 0) / total;

  // Weight the score toward order progression while still reflecting payment, tracking, and fraud confidence.
  const accuracy = fulfillmentScore * 0.45 + paidScore * 0.25 + fraudSafety * 0.2 + trackingScore * 0.1;

  return {
    accuracy: Number(accuracy.toFixed(1)),
    orderCount: total,
    fulfillmentScore: Number(fulfillmentScore.toFixed(1)),
    paidScore: Number(paidScore.toFixed(1)),
    trackingScore: Number(trackingScore.toFixed(1)),
    fraudSafety: Number(fraudSafety.toFixed(1)),
  };
};

const buildSeries = (orders: Order[]) => {
  const datedOrders = orders
    .map((order) => ({ order, time: new Date(order.createdAt).getTime() }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);

  if (!datedOrders.length) {
    return null;
  }

  const lastOrderDay = startOfUtcDay(new Date(datedOrders[datedOrders.length - 1].time));
  const days = Array.from({ length: CHART_DAYS }, (_, index) => {
    const offset = CHART_DAYS - 1 - index;
    return new Date(lastOrderDay.getTime() - offset * DAY_MS);
  });

  const points: AccuracyPoint[] = days.map((day) => {
    const windowStart = day.getTime() - (ROLLING_WINDOW_DAYS - 1) * DAY_MS;
    const windowEnd = day.getTime() + DAY_MS;
    const windowOrders = datedOrders
      .filter((item) => item.time >= windowStart && item.time < windowEnd)
      .map((item) => item.order);
    const breakdown = calculateAccuracy(windowOrders);

    return {
      dayLabel: formatDayLabel(day),
      ...(breakdown || {
        accuracy: 0,
        orderCount: 0,
        fulfillmentScore: 0,
        paidScore: 0,
        trackingScore: 0,
        fraudSafety: 0,
      }),
    };
  });

  const currentPoint = points[points.length - 1];
  const previousWindowStart = lastOrderDay.getTime() - (ROLLING_WINDOW_DAYS * 2 - 1) * DAY_MS;
  const previousWindowEnd = lastOrderDay.getTime() - (ROLLING_WINDOW_DAYS - 1) * DAY_MS;
  const previousWindowOrders = datedOrders
    .filter((item) => item.time >= previousWindowStart && item.time < previousWindowEnd)
    .map((item) => item.order);
  const previousWindow = calculateAccuracy(previousWindowOrders);

  return {
    points,
    currentPoint,
    previousAccuracy: previousWindow?.accuracy ?? null,
    lastOrderDayLabel: formatDayLabel(lastOrderDay),
  };
};

export default function ProjectAccuracyChart({ orders }: ProjectAccuracyChartProps) {
  const chart = useMemo(() => buildSeries(orders), [orders]);

  if (!chart) {
    return (
      <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Project accuracy</p>
          <h2 className="text-2xl font-semibold text-white">Line graph ready</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            The chart will activate as soon as order activity is available. It uses real delivery progress, payment completion, tracking coverage,
            and fraud safety to estimate project accuracy.
          </p>
        </div>
      </section>
    );
  }

  const { points, currentPoint, previousAccuracy, lastOrderDayLabel } = chart;
  const delta = previousAccuracy === null ? null : Number((currentPoint.accuracy - previousAccuracy).toFixed(1));
  const values = points.map((point) => point.accuracy);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = Math.max(0, Math.floor((rawMin - 4) / 10) * 10);
  const maxValue = Math.min(100, Math.ceil((rawMax + 4) / 10) * 10);
  const domainMin = minValue === maxValue ? Math.max(0, minValue - 10) : minValue;
  const domainMax = minValue === maxValue ? Math.min(100, maxValue + 10) : maxValue;
  const width = 640;
  const height = 260;
  const padding = { top: 20, right: 18, bottom: 32, left: 18 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const denominator = Math.max(1, domainMax - domainMin);
  const coords = points.map((point, index) => {
    const x = padding.left + (index / Math.max(1, points.length - 1)) * innerWidth;
    const y = padding.top + ((domainMax - point.accuracy) / denominator) * innerHeight;
    return { ...point, x, y };
  });
  const linePath = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z`;
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return Number((domainMax - (domainMax - domainMin) * ratio).toFixed(0));
  });

  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_280px]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Project accuracy</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <h2 className="text-4xl font-semibold text-white">{currentPoint.accuracy}%</h2>
                <span className="pb-1 text-sm text-slate-300">Rolling 7-day score ending {lastOrderDayLabel}</span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Professional trend line built from order progress, payment completion, tracking coverage, and fraud safety so you can monitor
                how accurately the project is performing over time.
              </p>
            </div>
            {delta !== null ? (
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  delta >= 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {delta} pts vs prior 7-day window
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="Project accuracy line graph">
              <defs>
                <linearGradient id="accuracy-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>

              {ticks.map((tick) => {
                const y = padding.top + ((domainMax - tick) / denominator) * innerHeight;
                return (
                  <g key={tick}>
                    <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="6 6" />
                    <text x={width - padding.right} y={y - 6} textAnchor="end" fontSize="11" fill="rgba(226, 232, 240, 0.7)">
                      {tick}%
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#accuracy-fill)" />
              <path d={linePath} fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

              {coords.map((point) => (
                <g key={point.dayLabel}>
                  <circle cx={point.x} cy={point.y} r="5.5" fill="#0f172a" stroke="#67e8f9" strokeWidth="2.5" />
                  <text x={point.x} y={height - 10} textAnchor="middle" fontSize="11" fill="rgba(226, 232, 240, 0.85)">
                    {point.dayLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="grid gap-3 self-start">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Orders sampled</p>
            <p className="mt-3 text-3xl font-semibold text-white">{currentPoint.orderCount}</p>
            <p className="mt-2 text-sm text-slate-300">Current rolling window size used for the chart.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              ["Flow completion", `${currentPoint.fulfillmentScore}%`],
              ["Paid coverage", `${currentPoint.paidScore}%`],
              ["Tracking coverage", `${currentPoint.trackingScore}%`],
              ["Fraud safety", `${currentPoint.fraudSafety}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
