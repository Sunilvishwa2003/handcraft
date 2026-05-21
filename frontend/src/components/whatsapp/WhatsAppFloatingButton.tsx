"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { buildWhatsAppHref } from "@/lib/customization";
import { WhatsAppInquiryPreview } from "@/lib/types";

const FALLBACK_WHATSAPP_MESSAGE = "Hello, I want to discuss a handcrafted customization request.";

export default function WhatsAppFloatingButton() {
  const [loading, setLoading] = useState(false);

  const openWhatsApp = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const preview = await apiFetch<WhatsAppInquiryPreview>("/whatsapp/inquiry-preview", {
        method: "POST",
        body: JSON.stringify({
          inquiryType: "request-quotation",
          notes: "Opened from floating WhatsApp button",
        }),
      });

      const phoneNumber =
        preview.phoneNumber?.trim() || process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER?.trim() || "";

      if (!phoneNumber) {
        throw new Error("WhatsApp contact is unavailable right now.");
      }

      const message = preview.message?.trim() || FALLBACK_WHATSAPP_MESSAGE;
      window.open(buildWhatsAppHref(phoneNumber, message), "_blank", "noopener,noreferrer");
      toast.success("Opening WhatsApp");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={() => void openWhatsApp()}
      whileHover={{ scale: 1.04, y: -3 }}
      whileTap={{ scale: 0.96 }}
      disabled={loading}
      aria-label="Open WhatsApp chat"
      className="fixed bottom-5 left-4 z-[60] flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_22px_48px_rgba(37,211,102,0.32)] ring-1 ring-white/50 transition disabled:cursor-not-allowed disabled:opacity-70 md:bottom-8 md:left-8"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 blur-md animate-[whatsapp-pulse_2.6s_ease-in-out_infinite]" />
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
        <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current">
          <path d="M19.11 17.34c-.28-.14-1.65-.81-1.91-.91-.26-.09-.45-.14-.64.14-.19.28-.73.91-.9 1.1-.16.19-.33.21-.61.07-.28-.14-1.17-.43-2.22-1.36-.82-.73-1.38-1.62-1.54-1.9-.16-.28-.02-.43.12-.57.12-.12.28-.33.42-.49.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.54-.88-2.11-.23-.56-.47-.49-.64-.5l-.54-.01c-.19 0-.49.07-.75.35-.26.28-.98.95-.98 2.31 0 1.36 1 2.68 1.14 2.86.14.19 1.96 2.99 4.75 4.19.66.28 1.18.45 1.58.57.66.21 1.26.18 1.73.11.53-.08 1.65-.67 1.88-1.31.23-.64.23-1.19.16-1.31-.07-.12-.26-.19-.54-.33z" />
          <path d="M16.03 3.2c-7.07 0-12.8 5.72-12.8 12.8 0 2.26.59 4.48 1.72 6.43L3.1 28.8l6.54-1.72a12.74 12.74 0 006.39 1.74h.01c7.07 0 12.8-5.72 12.8-12.8 0-3.43-1.34-6.65-3.76-9.07A12.75 12.75 0 0016.03 3.2zm0 23.44h-.01a10.58 10.58 0 01-5.39-1.48l-.39-.23-3.88 1.02 1.04-3.78-.25-.39a10.56 10.56 0 01-1.62-5.63c0-5.84 4.75-10.59 10.6-10.59 2.83 0 5.49 1.1 7.49 3.1a10.53 10.53 0 013.11 7.49c0 5.84-4.76 10.59-10.6 10.59z" />
        </svg>
      </span>
      <span className="relative hidden sm:block">{loading ? "Opening..." : "Talk to Artisan"}</span>
    </motion.button>
  );
}
