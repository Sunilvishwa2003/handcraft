"use client";

import { FormEvent, Suspense, useEffect, useEffectEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiFetch,
  clearBuyNowCart,
  formatPrice,
  getBuyNowCart,
  getCartItemImageUrl,
  getGuestCart,
  getStoredUser,
  setBuyNowCart,
  setGuestCart,
} from "@/lib/api";
import { launchRazorpayCheckout } from "@/lib/razorpay";
import { Cart, Order, User } from "@/lib/types";

type Summary = {
  subtotal: number;
  discountPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  fraud: { score: number; decision: string; flags: string[] };
};

const razorpayBenefits = ["UPI", "Cards", "Net Banking", "Wallets"];
const fieldClassName =
  "customer-input mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-normal text-gray-950 placeholder:text-slate-400 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";
const selectClassName =
  "customer-input mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-950 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";
const EMPTY_CART: Cart = { items: [], subtotal: 0, discountAmount: 0, total: 0 };

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNowMode = searchParams.get("mode") === "buy-now";
  const successOrderId = searchParams.get("success");
  const [cart, setCart] = useState<Cart | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "India",
    phone: "",
    paymentMethod: "razorpay",
    shippingOption: "standard" as const,
  });
  const [user, setUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (items: Cart["items"], paymentMethod: string, shippingOption: string) => {
    return apiFetch<Summary>("/orders/summary", {
      method: "POST",
      body: JSON.stringify({ paymentMethod, shippingOption, items }),
    });
  };

  const loadCart = useEffectEvent(async () => {
    setLoading(true);
    const storedUser = getStoredUser();
    setUser(storedUser);
    const buyNowCart = isBuyNowMode ? getBuyNowCart() : null;
    const nextCart = buyNowCart?.items.length ? buyNowCart : storedUser?.token ? await apiFetch<Cart>("/cart") : getGuestCart();
    setCart(nextCart);
    if (!nextCart.items.length) {
      setSummary(null);
      setLoading(false);
      return;
    }

    setSummary(await fetchSummary(nextCart.items, form.paymentMethod, form.shippingOption));
    setLoading(false);
  });

  useEffect(() => {
    if (successOrderId) {
      return;
    }

    const syncCheckout = () => {
      loadCart().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not load checkout");
        setLoading(false);
      });
    };

    syncCheckout();
    window.addEventListener("cart:changed", syncCheckout);
    window.addEventListener("storage", syncCheckout);

    return () => {
      window.removeEventListener("cart:changed", syncCheckout);
      window.removeEventListener("storage", syncCheckout);
    };
  }, [isBuyNowMode, successOrderId]);

  const updateQty = async (productId: string, qty: number) => {
    if (!cart) {
      return;
    }

    if (qty < 1) {
      await removeItem(productId);
      return;
    }

    const currentItem = cart.items.find((item) => item.product === productId);
    if (currentItem && qty > currentItem.countInStock) {
      setMessage(`Only ${currentItem.countInStock} item${currentItem.countInStock === 1 ? "" : "s"} available.`);
      return;
    }

    setMessage("");

    try {
      if (isBuyNowMode) {
        const items = cart.items.map((item) => (item.product === productId ? { ...item, qty } : item));
        setBuyNowCart(items);
        const nextCart = getBuyNowCart() || EMPTY_CART;
        setCart(nextCart);
        setSummary(nextCart.items.length ? await fetchSummary(nextCart.items, form.paymentMethod, form.shippingOption) : null);
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser?.token) {
        const nextCart = await apiFetch<Cart>("/cart/items", { method: "PUT", body: JSON.stringify({ productId, qty }) });
        setCart(nextCart);
        setSummary(nextCart.items.length ? await fetchSummary(nextCart.items, form.paymentMethod, form.shippingOption) : null);
        window.dispatchEvent(new Event("cart:changed"));
        return;
      }

      const items = cart.items.map((item) => (item.product === productId ? { ...item, qty } : item));
      setGuestCart(items);
      const nextCart = getGuestCart();
      setCart(nextCart);
      setSummary(nextCart.items.length ? await fetchSummary(nextCart.items, form.paymentMethod, form.shippingOption) : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update checkout items.");
    }
  };

  const removeItem = async (productId: string) => {
    if (!cart) {
      return;
    }

    setMessage("");

    try {
      if (isBuyNowMode) {
        const items = cart.items.filter((item) => item.product !== productId);
        if (items.length) {
          setBuyNowCart(items);
          const nextCart = getBuyNowCart() || EMPTY_CART;
          setCart(nextCart);
        } else {
          clearBuyNowCart();
          setCart(EMPTY_CART);
        }
        setSummary(items.length ? await fetchSummary(items, form.paymentMethod, form.shippingOption) : null);
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser?.token) {
        const nextCart = await apiFetch<Cart>(`/cart/items/${productId}`, { method: "DELETE" });
        setCart(nextCart);
        setSummary(nextCart.items.length ? await fetchSummary(nextCart.items, form.paymentMethod, form.shippingOption) : null);
        window.dispatchEvent(new Event("cart:changed"));
        return;
      }

      const items = cart.items.filter((item) => item.product !== productId);
      setGuestCart(items);
      const nextCart = getGuestCart();
      setCart(nextCart);
      setSummary(nextCart.items.length ? await fetchSummary(nextCart.items, form.paymentMethod, form.shippingOption) : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the item from checkout.");
    }
  };

  const updatePaymentMethod = async (paymentMethod: string) => {
    setForm((current) => ({ ...current, paymentMethod }));
    setMessage("");

    if (!cart) {
      return;
    }

    try {
      setSummary(await fetchSummary(cart.items, paymentMethod, form.shippingOption));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load checkout");
    }
  };

  const validateCheckout = () => {
    const errors: Record<string, string> = {};
    if (!form.address.trim()) errors.address = "Address is required.";
    if (!form.city.trim()) errors.city = "City is required.";
    if (!/^[0-9]{6}$/.test(form.postalCode.trim())) errors.postalCode = "Enter valid 6-digit pincode.";
    if (!/^[0-9]{10}$/.test(form.phone.trim())) errors.phone = "Enter valid 10-digit phone.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!cart?.items.length) {
      setMessage("Your cart is empty.");
      return;
    }

    if (!validateCheckout()) {
      setMessage("Please fix the highlighted fields.");
      return;
    }

    setIsProcessing(true);
    try {
      const shippingAddress = {
        address: form.address.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        phone: form.phone.trim(),
      };

      let order: Order;

      if (form.paymentMethod === "razorpay") {
        order = await launchRazorpayCheckout({
          createOrderPayload: {
            items: cart.items,
            shippingOption: form.shippingOption,
            couponCode: cart.couponCode,
          },
          verifyPayload: {
            items: cart.items,
            shippingOption: form.shippingOption,
            couponCode: cart.couponCode,
            shippingAddress,
          },
          customer: {
            name: user?.name || "Guest shopper",
            email: user?.email,
            contact: shippingAddress.phone,
          },
          description: `Checkout payment for ${cart.items.length} item${cart.items.length > 1 ? "s" : ""}`,
          dismissMessage: "Payment was cancelled.",
        });
      } else {
        order = await apiFetch<Order>("/orders", {
          method: "POST",
          body: JSON.stringify({
            shippingAddress,
            shippingOption: form.shippingOption,
            paymentMethod: "cod",
            items: cart.items,
            couponCode: cart.couponCode,
          }),
        });
      }

      if (!getStoredUser()?.token) {
        if (isBuyNowMode) {
          clearBuyNowCart();
        } else {
          setGuestCart([]);
        }
        router.push(`/checkout?success=${order._id}`);
        return;
      }

      if (isBuyNowMode) {
        clearBuyNowCart();
      }

      router.push(`/orders/${order._id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not place order");
    } finally {
      setIsProcessing(false);
    }
  };

  const canPlaceOrder = Boolean(
    !loading &&
      cart?.items.length &&
      form.address.trim() &&
      form.city.trim() &&
      /^[0-9]{6}$/.test(form.postalCode.trim()) &&
      /^[0-9]{10}$/.test(form.phone.trim())
  );

  if (successOrderId) {
    return (
      <main className="min-h-screen bg-gray-100 px-3 py-6 sm:px-4 md:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Order placed</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-950 sm:text-3xl">Your order is confirmed.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Keep this order ID for support and delivery updates: <span className="font-semibold text-gray-900">{successOrderId}</span>
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="rounded-lg bg-sky-400 px-4 py-3 text-sm font-semibold text-gray-950 hover:bg-sky-300"
            >
              Continue shopping
            </button>
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Sign in to track orders
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-3 py-3 sm:px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">Home / Checkout</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-950">Checkout</h1>
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">{message}</div>
        ) : null}

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Checkout Form */}
          <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5 md:p-6">
            {loading ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">Loading checkout...</div>
            ) : !cart?.items.length ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-600">There are no items ready for checkout.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/cart")}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
                  >
                    Back to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/products")}
                    className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-sky-300"
                  >
                    Browse products
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={placeOrder} className="space-y-5">
              {isBuyNowMode ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  You are checking out a direct Buy Now selection. Quantity changes here will update this checkout only.
                </div>
              ) : null}
              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">Shipping Address</label>
                <textarea
                  required
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  rows={4}
                  className={`${fieldClassName} resize-y ${
                    formErrors.address ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="House no., Street, Area"
                />
                {formErrors.address && <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>}
              </div>

              {/* City, Pincode, Phone - Grid on larger screens */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">City</label>
                  <input
                    required
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    className={`${fieldClassName} ${
                      formErrors.city ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="City"
                  />
                  {formErrors.city && <p className="mt-1 text-xs text-red-600">{formErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Pincode</label>
                  <input
                    required
                    value={form.postalCode}
                    onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
                    maxLength={6}
                    inputMode="numeric"
                    className={`${fieldClassName} ${
                      formErrors.postalCode ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="123456"
                  />
                  {formErrors.postalCode && <p className="mt-1 text-xs text-red-600">{formErrors.postalCode}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Phone</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    maxLength={10}
                    inputMode="tel"
                    className={`${fieldClassName} ${
                      formErrors.phone ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="9876543210"
                  />
                  {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
                </div>
              </div>

              {/* WhatsApp Updates */}
              {form.phone && form.phone.length === 10 && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500" defaultChecked />
                  <span>Get order updates via <b>WhatsApp</b></span>
                </label>
              )}

              {/* Shipping Option */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Delivery Speed</label>
                  <select
                    value={form.shippingOption}
                    onChange={(event) => {
                      const option = event.target.value as typeof form.shippingOption;
                      setForm((current) => ({ ...current, shippingOption: option }));
                      if (cart) {
                        fetchSummary(cart.items, form.paymentMethod, option)
                          .then(setSummary)
                          .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load checkout"));
                      }
                    }}
                    className={selectClassName}
                  >
                    <option value="standard">Standard - ₹49 per product</option>
                    <option value="express">Express - ₹49 per product</option>
                    <option value="priority">Priority - ₹49 per product</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(event) => void updatePaymentMethod(event.target.value)}
                    className={selectClassName}
                  >
                    <option value="razorpay">Razorpay (UPI, Cards, Net Banking)</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              {/* Payment Info */}
              {form.paymentMethod === "razorpay" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Secure Payment</p>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">Pay with Razorpay</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    UPI, credit/debit cards, net banking, and wallets supported.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {razorpayBenefits.map((benefit) => (
                      <span key={benefit} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                  Pay when your order arrives.
                </div>
              )}

              {/* Submit Button */}
              <button
                disabled={!canPlaceOrder || isProcessing}
                className="w-full rounded-lg bg-sky-400 px-4 py-3 font-bold text-gray-950 transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing
                  ? form.paymentMethod === "razorpay"
                    ? "Opening Razorpay..."
                    : "Placing order..."
                  : form.paymentMethod === "razorpay"
                    ? "Proceed to Payment"
                    : "Place COD Order"}
              </button>
            </form>
            )}
          </section>

          {/* Order Summary - Sticky on desktop */}
          <aside className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5 xl:sticky xl:top-24">
            <h2 className="text-lg font-bold text-gray-950">Order Summary</h2>
            
            {/* Cart Items */}
            <div className="mt-4 space-y-3 xl:max-h-[26rem] xl:overflow-y-auto xl:pr-1">
              {cart?.items.map((item) => (
                <div key={item.product} className="flex items-start gap-3 text-sm">
                  <img
                    src={getCartItemImageUrl(item.image)}
                    alt={item.name}
                    className="h-14 w-14 shrink-0 rounded-md bg-gray-50 object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/mahabs-logo.svg";
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">{item.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center rounded-md border border-gray-300 bg-white">
                        <button
                          type="button"
                          onClick={() => void updateQty(item.product, item.qty - 1)}
                          className="h-7 w-7 text-base font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-xs font-semibold text-gray-700">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => void updateQty(item.product, item.qty + 1)}
                          disabled={item.qty >= item.countInStock}
                          className="h-7 w-7 text-base font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeItem(item.product)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-gray-900">{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatPrice(summary?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="text-emerald-600">-{formatPrice(summary?.discountPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">{formatPrice(summary?.taxPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">{formatPrice(summary?.shippingPrice || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base">
                <span>Total</span>
                <span className="text-gray-950">{formatPrice(summary?.totalPrice || 0)}</span>
              </div>
            </div>

            {/* Fraud Check */}
            {summary?.fraud && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                Fraud score {summary.fraud.score}/100 · {summary.fraud.decision}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-100 p-6 text-gray-500 flex items-center justify-center">Loading checkout...</main>}>
      <CheckoutPageContent />
    </Suspense>
  );
}
