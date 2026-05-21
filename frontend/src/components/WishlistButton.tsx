"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleWishlistProduct, useWishlist } from "@/hooks/useWishlist";

type WishlistButtonProps = {
  productId: string;
  variant?: "icon" | "full";
  className?: string;
  onToggle?: (saved: boolean) => void;
};

const baseClasses = {
  icon: "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60",
  full: "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60",
};

export default function WishlistButton({
  productId,
  variant = "icon",
  className = "",
  onToggle,
}: WishlistButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isWishlisted } = useWishlist(productId);
  const [loading, setLoading] = useState(false);

  const redirectTarget = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const handleToggle = async () => {
    setLoading(true);

    try {
      const saved = await toggleWishlistProduct(productId);
      onToggle?.(saved);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Login")) {
        router.push(`/account?redirect=${encodeURIComponent(redirectTarget)}`);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const iconClasses = isWishlisted ? "fill-rose-500 text-rose-500" : "fill-transparent text-current";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={isWishlisted}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`${baseClasses[variant]} ${className}`.trim()}
    >
      <svg className={`h-5 w-5 transition ${iconClasses}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A4.5 4.5 0 016.5 4 5.4 5.4 0 0112 7.09 5.4 5.4 0 0117.5 4 4.5 4.5 0 0122 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
      {variant === "full" ? <span>{isWishlisted ? "Saved" : "Save to wishlist"}</span> : null}
    </button>
  );
}
