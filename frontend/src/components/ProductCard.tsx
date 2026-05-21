"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import WishlistButton from "@/components/WishlistButton";
import {
  apiFetch,
  buildCartItemFromProduct,
  formatPrice,
  getGuestCart,
  getProductPrimaryImageUrl,
  getStoredUser,
  setGuestCart,
} from "@/lib/api";
import { getProductCategoryName, isProductFullyCustomizable } from "@/lib/catalog";
import { Cart, Product } from "@/lib/types";

function shouldShowPrice(product: Product): boolean {
  if (product.showPrice === false) return false;
  if (isProductFullyCustomizable(product)) return false;
  return true;
}

export default function ProductCard({
  product,
  compact = false,
  onWishlistToggle,
}: {
  product: Product;
  compact?: boolean;
  onWishlistToggle?: (saved: boolean) => void;
}) {
  const showPrice = shouldShowPrice(product);

  const addToCart = async () => {
    const user = getStoredUser();
    try {
      if (user?.token) {
        await apiFetch<Cart>("/cart/items", {
          method: "PUT",
          body: JSON.stringify({ productId: product._id, qty: 1 }),
        });
        window.dispatchEvent(new Event("cart:changed"));
        toast.success("Added to cart");
        return;
      }

      const cart = getGuestCart();
      const existing = cart.items.find((item) => item.product === product._id);
      const items = existing
        ? cart.items.map((item) => (item.product === product._id ? { ...item, qty: item.qty + 1 } : item))
        : [...cart.items, buildCartItemFromProduct(product, 1)];
      setGuestCart(items);
      toast.success("Added to cart");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add this item to the cart.");
    }
  };

  const productImage = getProductPrimaryImageUrl(product);

  return (
    <motion.article 
      whileHover={{ y: -3, scale: 1.01 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mobile-card relative flex h-full min-w-0 flex-col border border-gray-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm transition-all hover:shadow-lg"
    >
      {/* Wishlist Button */}
      <div className="absolute right-1.5 top-1.5 z-10 sm:right-3 sm:top-3">
        <WishlistButton productId={product._id} onToggle={onWishlistToggle} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Product Image */}
        <Link href={`/products/${product._id}`} className="block min-w-0" aria-label={`View ${product.name} details`}>
          <div
            className={`relative overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_60%)] ${
              compact ? "aspect-[4/4.3] sm:aspect-square" : "aspect-[4/4.4] sm:aspect-square"
            }`}
          >
            <img
              src={productImage}
              alt={product.name}
              className="h-full w-full object-contain bg-slate-50 p-2 sm:p-3"
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/mahabs-logo.svg';
              }}
            />
          </div>

          {/* Rating & Stock Badges - Compact on mobile */}
          <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] sm:gap-1.5 sm:text-xs">
            <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-white font-semibold">
              {product.rating || 0}★
            </span>
            <span className="text-gray-500">
              {product.numReviews || 0}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 font-medium ${
              product.countInStock > 0 ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'
            }`}>
              {product.countInStock > 0 ? 'In stock' : 'Out'}
            </span>
          </div>

          {/* Product Title - 2 lines max */}
          <h3 className="mt-1.5 min-h-[2.4rem] text-[0.95rem] font-semibold leading-5 text-gray-900 line-clamp-2 sm:min-h-[2.9rem] sm:text-base">
            {product.name}
          </h3>

          {/* Brand & Category */}
          <p className="mt-1 truncate text-[10px] text-gray-500 sm:text-xs">
            {product.brand} · {getProductCategoryName(product.category)}
          </p>
        </Link>

        {/* Price & Add to Cart - Pinned to bottom */}
        <div className="mt-auto border-t border-gray-100 pt-2.5 sm:pt-3">
          {showPrice ? (
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className="text-sm font-bold text-gray-950 sm:text-lg">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-[10px] text-gray-500 line-through sm:text-xs">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {product.discountPercentage && (
                <span className="text-[10px] font-semibold text-emerald-700 sm:text-xs">
                  {product.discountPercentage}% off
                </span>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_40px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_48px] sm:gap-3">
            {showPrice ? (
              <button
                type="button"
                onClick={addToCart}
                disabled={product.countInStock <= 0}
                className="btn-mobile flex w-full min-w-0 items-center justify-center rounded-lg bg-sky-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:bg-sky-600 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:rounded-xl sm:px-4 sm:text-sm"
              >
                Add to Cart
              </button>
            ) : (
              <Link
                href={`/products/${product._id}`}
                className="btn-mobile flex w-full min-w-0 items-center justify-center rounded-lg bg-sky-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:bg-sky-600 hover:shadow-md sm:rounded-xl sm:px-4 sm:text-sm"
              >
                Customize
              </Link>
            )}
            <Link
              href={`/products/${product._id}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 transition hover:bg-gray-50 sm:h-12 sm:w-12 sm:rounded-xl"
              aria-label={`View details of ${product.name}`}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
