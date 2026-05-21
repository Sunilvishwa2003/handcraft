"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { buildWhatsAppHref, inquiryTypeOptions } from "@/lib/customization";
import { CustomProjectInquiryType, CustomizationSelection, Product, WhatsAppInquiryPreview } from "@/lib/types";

type WhatsAppInquiryModalProps = {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  customization?: CustomizationSelection;
  budget?: string;
  notes?: string;
  title?: string;
  inquiryType?: CustomProjectInquiryType;
};

export default function WhatsAppInquiryModal({
  open,
  onClose,
  product,
  customization,
  budget,
  notes,
  title = "Talk to Artisan",
  inquiryType,
}: WhatsAppInquiryModalProps) {
  const [internalSelectedType, setInternalSelectedType] = useState<CustomProjectInquiryType>(inquiryType ?? "request-quotation");
  const selectedType = inquiryType ?? internalSelectedType;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const openWhatsApp = async () => {
    setLoading(true);
    setMessage("");

    try {
      const preview = await apiFetch<WhatsAppInquiryPreview>("/whatsapp/inquiry-preview", {
        method: "POST",
        body: JSON.stringify({
          productId: product?._id,
          inquiryType: selectedType,
          customization,
          budget,
          notes,
        }),
      });

      const phoneNumber = preview.phoneNumber || process.env.WHATSAPP_PHONE_NUMBER || "";
      if (!phoneNumber) {
        setMessage("Add a WhatsApp phone number in the environment to enable artisan chat.");
        return;
      }

      window.open(buildWhatsAppHref(phoneNumber, preview.message), "_blank", "noopener,noreferrer");
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare WhatsApp inquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-70 flex items-end justify-center bg-slate-950/65 px-4 py-4 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(255,255,255,0.98))] p-4 shadow-[0_36px_100px_rgba(15,23,42,0.26)] backdrop-blur sm:p-5 md:rounded-4xl md:p-7"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">WhatsApp Atelier</p>
                <h3 className="mt-2 wrap-break-word text-xl font-semibold text-slate-950 sm:text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose the kind of conversation you want, and we will prepare a polished message with your product and customization details.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {inquiryTypeOptions.map((option) => {
                const active = option.value === selectedType;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (inquiryType === undefined) {
                        setInternalSelectedType(option.value);
                      }
                    }}
                    className={`w-full overflow-hidden rounded-3xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50 shadow-[0_18px_40px_rgba(16,185,129,0.12)]"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 wrap-break-word pr-2 text-base font-semibold text-slate-950">{option.label}</span>
                      {active ? (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                  </button>
                );
              })}
            </div>

            {product?.name || customization?.material || customization?.size ? (
              <div className="mt-6 rounded-3xl bg-slate-950 px-4 py-4 text-sm text-slate-100 sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Prepared context</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {product?.name ? <p>Product: {product.name}</p> : null}
                  {customization?.material ? <p>Material: {customization.material}</p> : null}
                  {customization?.size ? <p>Size: {customization.size}</p> : null}
                  {customization?.finish ? <p>Finish: {customization.finish}</p> : null}
                  {customization?.engravingText ? <p>Engraving: {customization.engravingText}</p> : null}
                  {budget ? <p>Budget: {budget}</p> : null}
                </div>
              </div>
            ) : null}

            {message ? <div className="mt-5 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                disabled={loading}
                className="rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_35px_rgba(37,211,102,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Preparing..." : "Continue to WhatsApp"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
