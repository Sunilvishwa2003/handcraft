"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

export default function TelegramTestButton({ orderId }: { orderId?: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setStatus(null);
    setError(null);
    setBusy(true);

    try {
      const message = orderId
        ? `Telegram notification test for order ${orderId}`
        : "Telegram notification test from admin panel.";
      await apiFetch<{ success: boolean; error?: string }>("/admin/test-telegram", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setStatus("Telegram test message sent successfully.");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={handleClick}
        className="inline-flex items-center justify-center rounded-full bg-sky-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Sending test..." : "Send Telegram test"}
      </button>
      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-rose-600">Error: {error}</p> : null}
    </div>
  );
}
