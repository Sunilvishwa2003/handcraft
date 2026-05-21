"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import WhatsAppInquiryModal from "@/components/whatsapp/WhatsAppInquiryModal";
import { CustomProjectInquiryType, CustomizationSelection } from "@/lib/types";
import { inquiryTypeOptions } from "@/lib/customization";

export default function CustomOrderPage() {
  const [open, setOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState<CustomProjectInquiryType>("custom-design-inquiry");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [finish, setFinish] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const customization: CustomizationSelection = useMemo(
    () => ({ material, size, finish, customNotes: notes }),
    [material, size, finish, notes]
  );

  const handleOpen = () => {
    if (!notes.trim() && !material && !size && !finish && !budget) {
      setError("Please provide a few details so we can prepare the right artisan message.");
      return;
    }

    setError("");
    setOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,205,96,0.16),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_18%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_24px,rgba(255,255,255,0.03)_25px),repeating-linear-gradient(90deg,transparent,transparent_24px,rgba(255,255,255,0.03)_25px)] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-12 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-slate-200/80 backdrop-blur-md shadow-sm">
                MAHABS CRAFTO • HANDCRAFTED STONE ART
              </div>

              <h1 className="mt-8 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Start your custom stone order.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Tell us what you want, and our artisan team will shape it into a premium name board, memorial plaque, temple carving, or décor piece.
              </p>

              <div className="mt-10 space-y-6 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_rgba(8,12,20,0.45)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200/85">Fast custom order details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-4">
                    <p className="text-base font-semibold text-white">Premium stone finish</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Select the surface and material that suit your project.</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-4">
                    <p className="text-base font-semibold text-white">Fully tailored design</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">We tailor every detail from dimensions to carving style.</p>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_rgba(8,12,20,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 rounded-4xl bg-[linear-gradient(135deg,rgba(245,205,96,0.1),transparent_48%)]" />
              <div className="relative space-y-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200/90">Artisan inquiry form</p>
                  <h2 className="mt-3 text-3xl font-bold text-white">Share your custom project details.</h2>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm text-slate-100">
                    Project type
                    <input
                      value={inquiryType}
                      onChange={(event) => setInquiryType(event.target.value as CustomProjectInquiryType)}
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                      aria-label="Project type"
                      list="inquiry-options"
                    />
                    <datalist id="inquiry-options">
                      {inquiryTypeOptions.map((option) => (
                        <option key={option.value} value={option.value} />
                      ))}
                    </datalist>
                  </label>

                  <label className="grid gap-2 text-sm text-slate-100">
                    Material preference
                    <input
                      value={material}
                      onChange={(event) => setMaterial(event.target.value)}
                      placeholder="Granite, marble, sandstone, etc."
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-slate-100">
                    Approximate size
                    <input
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                      placeholder="24x18 inch, 2x2 ft, custom dimensions"
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-slate-100">
                    Desired finish
                    <input
                      value={finish}
                      onChange={(event) => setFinish(event.target.value)}
                      placeholder="Polished, matte, chiseled, aged"
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-slate-100">
                    Budget range
                    <input
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder="e.g. ₹15,000 - ₹25,000"
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-slate-100">
                    Project notes
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Describe the design, engraving text, placement, or mood you want."
                      rows={5}
                      className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-slate-100">
                    Contact details (optional)
                    <input
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      placeholder="Email or phone for follow-up"
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-amber-300"
                    />
                  </label>
                </div>

                {error ? (
                  <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
                ) : null}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2 text-sm text-slate-300">
                    <p className="font-semibold text-white">Ready when you are</p>
                    <p>We’ll craft the WhatsApp message with your details and open the artisan chat instantly.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpen}
                    className="inline-flex items-center justify-center rounded-[28px] bg-linear-to-r from-amber-300 via-amber-200 to-amber-400 px-8 py-4 text-sm font-semibold text-slate-950 shadow-[0_24px_60px_rgba(245,158,11,0.22)] transition duration-300 hover:-translate-y-0.5"
                  >
                    Start WhatsApp inquiry
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <WhatsAppInquiryModal
        open={open}
        onClose={() => setOpen(false)}
        title="Send a custom order inquiry"
        inquiryType={inquiryType}
        customization={customization}
        budget={budget}
        notes={contact ? `${notes}\n\nContact: ${contact}` : notes}
      />
    </main>
  );
}
