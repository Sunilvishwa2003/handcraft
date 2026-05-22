"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import WhatsAppFloatingButton from "@/components/whatsapp/WhatsAppFloatingButton";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Promotional Banner - Mobile Optimized */}
      <div className="bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-300 py-1.5 text-center text-xs sm:text-sm font-bold text-slate-950 overflow-hidden">
        <span className="inline-block animate-pulse">
          Unlock 10% off with code: <span className="rounded bg-slate-950 px-2 py-0.5 uppercase tracking-wide text-cyan-100">DYNAMIC10</span>
        </span>
      </div>

      <Navbar />

      <div className="flex-1 overflow-x-hidden pb-24 md:pb-0">{children}</div>
      
      <WhatsAppFloatingButton />

      {/* Mobile-Optimized Footer */}
      <footer className="mt-auto bg-[#131921] py-8 sm:py-12 text-gray-300">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Newsletter Section - Stacked on mobile */}
          <div className="mb-6 sm:mb-8">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Join our Newsletter</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Get exclusive offers and early access to new arrivals.
                </p>
              </div>
              <form className="flex" action="/">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  required 
                  className="flex-1 rounded-l-lg px-3 py-2 text-sm text-gray-900 outline-none min-w-0" 
                />
                <button 
                  type="submit" 
                  className="rounded-r-lg bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-300 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg hover:from-sky-600 hover:to-cyan-500"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Push Notifications - Compact on mobile */}
          <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800/50 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400 shrink-0">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Enable Push Notifications</p>
                <p className="mb-2 mt-1 text-xs text-gray-400">
                  Never miss a flash sale or restock alert.
                </p>
                <Link 
                  href="/?push=enabled" 
                  className="inline-block rounded bg-white px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-gray-200"
                >
                  Enable now
                </Link>
              </div>
            </div>
          </div>

          {/* Footer Links - Stacked on mobile */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-xs sm:text-sm text-gray-500">
                &copy; {new Date().getFullYear()} MahabsCrafto. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                <Link href="/faq" className="text-xs sm:text-sm transition-colors hover:text-sky-400">
                  FAQ
                </Link>
                <Link href="/refund-policy" className="text-xs sm:text-sm transition-colors hover:text-sky-400">
                  Refund Policy
                </Link>
                <Link href="/custom-order" className="text-xs sm:text-sm transition-colors hover:text-sky-400">
                  Custom Orders
                </Link>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure Checkout
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 14.66V20a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h2.34M20 14.66l-2.34 2.34A2 2 0 0017 18.34V20m3-5.34V6a2 2 0 00-2-2h-1.66M17 18.34V16a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-6 0h12" />
              </svg>
              Handcrafted Quality
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Safe Payments
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
