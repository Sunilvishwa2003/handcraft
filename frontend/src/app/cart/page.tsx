"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { apiFetch, formatPrice, getCartItemImageUrl, getGuestCart, getStoredUser, setGuestCart } from "@/lib/api";
import { Cart } from "@/lib/types";

export default function CartPage() {
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0, discountAmount: 0, total: 0 });
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [pincode, setPincode] = useState("");
  const [shippingEstimate, setShippingEstimate] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useEffectEvent(async () => {
    setLoading(true);
    const user = getStoredUser();
    if (user?.token) {
      setCart(await apiFetch<Cart>("/cart"));
      setLoading(false);
      return;
    }

    setCart(getGuestCart());
    setLoading(false);
  });

  useEffect(() => {
    const syncCart = () => {
      load().catch(() => {
        setCart(getGuestCart());
        setLoading(false);
      });
    };

    syncCart();
    window.addEventListener("cart:changed", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cart:changed", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const updateQty = async (productId: string, qty: number) => {
    if (qty < 1) {
      return;
    }

    const currentItem = cart.items.find((item) => item.product === productId);
    if (currentItem && qty > currentItem.countInStock) {
      setMessage(`Only ${currentItem.countInStock} item${currentItem.countInStock === 1 ? "" : "s"} available.`);
      return;
    }

    const user = getStoredUser();
    setMessage("");

    try {
      if (user?.token) {
        setCart(await apiFetch<Cart>("/cart/items", { method: "PUT", body: JSON.stringify({ productId, qty }) }));
        window.dispatchEvent(new Event("cart:changed"));
      } else {
        const items = cart.items.map((item) => (item.product === productId ? { ...item, qty } : item));
        setGuestCart(items);
        setCart(getGuestCart());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the cart.");
    }
  };

  const remove = async (productId: string) => {
    const user = getStoredUser();
    setMessage("");

    try {
      if (user?.token) {
        setCart(await apiFetch<Cart>(`/cart/items/${productId}`, { method: "DELETE" }));
        window.dispatchEvent(new Event("cart:changed"));
      } else {
        setGuestCart(cart.items.filter((item) => item.product !== productId));
        setCart(getGuestCart());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the item.");
    }
  };

  const applyCoupon = async () => {
    setMessage("");
    const user = getStoredUser();

    if (!user?.token) {
      setMessage("Login to validate coupons at checkout.");
      return;
    }

    try {
      setCart(await apiFetch<Cart>("/cart/coupon", { method: "POST", body: JSON.stringify({ code: coupon }) }));
      setMessage(coupon.trim() ? "Coupon applied successfully." : "Coupon cleared.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not apply coupon");
    }
  };

  const calculateShipping = () => {
    if (!/^\d{6}$/.test(pincode.trim())) {
      setShippingEstimate("Enter a valid 6-digit pincode to estimate delivery.");
      return;
    }

    const itemCount = cart.items.reduce((sum, item) => sum + item.qty, 0);
    const deliveryWindow = "2-4 business days";
    setShippingEstimate(`Estimated shipping: ₹${itemCount * 49} • ${deliveryWindow}`);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-2 sm:p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">Home / Cart</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-950">Shopping Cart</h1>
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">{message}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Cart Items */}
          <section className="rounded-xl bg-white p-3 sm:p-4 shadow-sm">
            {loading ? (
              <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">Loading cart...</div>
            ) : cart.items.length ? (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <article key={item.product} className="flex gap-3 rounded-lg border border-gray-200 p-3">
                    {/* Product Image */}
                    <Link href={`/products/${item.product}`} className="shrink-0">
                      <img
                        src={getCartItemImageUrl(item.image)}
                        alt={item.name}
                        className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-md bg-gradient-to-br from-gray-100 to-gray-200"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = '/mahabs-logo.svg';
                          event.currentTarget.className = 'h-20 w-20 sm:h-24 sm:w-24 object-contain p-2 rounded-md bg-gray-100';
                        }}
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/products/${item.product}`} 
                        className="font-semibold text-gray-950 hover:text-cyan-700 line-clamp-2 text-sm sm:text-base"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm font-bold text-gray-950">{formatPrice(item.price)}</p>
                      
                      {/* Quantity Controls */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-gray-300">
                          <button 
                            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-100 rounded-l-lg"
                            onClick={() => updateQty(item.product, item.qty - 1)}
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] text-center text-sm font-semibold">{item.qty}</span>
                          <button 
                            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-100 rounded-r-lg"
                            onClick={() => updateQty(item.product, item.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          className="ml-auto text-sm font-semibold text-red-600 hover:text-red-700"
                          onClick={() => remove(item.product)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-950">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">Your cart is empty.</p>
                <Link 
                  href="/products" 
                  className="mt-4 inline-block rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-sky-300"
                >
                  Browse products
                </Link>
              </div>
            )}
          </section>

          {/* Order Summary - Sticky on mobile */}
          <aside className="lg:sticky lg:top-24 h-fit rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">Order Summary</h2>
            
            {/* Totals */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-emerald-600">-{formatPrice(cart.discountAmount || 0)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatPrice(cart.total || cart.subtotal)}</span>
              </div>
            </div>

            {/* Shipping Calculator */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-sm font-bold text-gray-950">Estimate Shipping</p>
              <div className="mt-2 flex gap-2">
                <input 
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value)}
                  placeholder="Pincode" 
                  className="customer-input flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" 
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                />
                <button 
                  onClick={calculateShipping}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Check
                </button>
              </div>
              {shippingEstimate ? (
                <p className="mt-2 text-xs text-gray-600">{shippingEstimate}</p>
              ) : null}
            </div>

            {/* Coupon */}
            <div className="mt-4">
              <div className="flex gap-2">
                <input 
                  value={coupon} 
                  onChange={(event) => setCoupon(event.target.value)} 
                  placeholder="Coupon code" 
                  className="customer-input flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" 
                />
                <button 
                  onClick={applyCoupon} 
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Checkout Button */}
            <Link 
              href="/checkout" 
              className="mt-4 block rounded-lg bg-sky-400 px-4 py-3 text-center font-bold text-gray-950 hover:bg-sky-300 transition-colors"
            >
              Proceed to Checkout
            </Link>

            {/* Continue Shopping */}
            <Link 
              href="/products" 
              className="mt-3 block text-center text-sm font-semibold text-cyan-700 hover:text-cyan-900"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
