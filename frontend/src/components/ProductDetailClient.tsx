"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import Product3DViewer from "@/components/Product3DViewer";
import ProductCard from "@/components/ProductCard";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import WishlistButton from "@/components/WishlistButton";
import {
  addRecentlyViewed,
  apiFetch,
  buildCartItemFromProduct,
  formatPrice,
  getGuestCart,
  getProductImageAlt,
  getProductImageUrl,
  getStoredUser,
  isBackendAssetUrl,
  setBuyNowCart,
  setGuestCart,
} from "@/lib/api";
import { canCustomizeProduct, getProductCategoryName, getProductCategorySlug, isProductFullyCustomizable } from "@/lib/catalog";
import { buildWhatsAppHref, getConfiguredWhatsAppPhoneNumber } from "@/lib/customization";
import StonePricingNotice from "@/components/product/StonePricingNotice";
import { Cart, Product, Review, WhatsAppInquiryPreview } from "@/lib/types";
import { MessageCircle } from "lucide-react";

function shouldShowPrice(product: Product): boolean {
  if (product.showPrice === false) return false;
  if (isProductFullyCustomizable(product)) return false;
  return true;
}

export default function ProductDetailClient({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewMode, setViewMode] = useState<'images' | '3d'>('images');
  const [review, setReview] = useState({ rating: "5", comment: "" });
  const [message, setMessage] = useState("");
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    apiFetch<Product>(`/products/${productId}`)
      .then((data) => {
        setProduct(data);
        addRecentlyViewed(data);
      })
      .catch((error) => setMessage(error.message));

    apiFetch<Product[]>(`/products/${productId}/related`).then(setRelated).catch(() => undefined);
    apiFetch<Review[]>(`/products/${productId}/reviews`).then(setReviews).catch(() => undefined);

    const user = getStoredUser();
    if (user?.token) {
      apiFetch(`/products/${productId}/view`, { method: "POST" }).catch(() => undefined);
    }
  }, [productId]);

  const addToCart = async () => {
    if (!product) {
      return;
    }

    const user = getStoredUser();
    try {
      if (user?.token) {
        await apiFetch<Cart>("/cart/items", {
          method: "PUT",
          body: JSON.stringify({ productId: product._id, qty: 1 }),
        });
      } else {
        const cart = getGuestCart();
        const existing = cart.items.find((item) => item.product === product._id);
        const items = existing
          ? cart.items.map((item) =>
              item.product === product._id ? { ...item, qty: item.qty + 1 } : item
            )
          : [...cart.items, buildCartItemFromProduct(product, 1)];
        setGuestCart(items);
      }

      if (user?.token) {
        window.dispatchEvent(new Event("cart:changed"));
      }
      setMessage("Added to cart.");
      toast.success("Added to cart");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Could not add to cart.";
      setMessage(nextMessage);
      toast.error(nextMessage);
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await apiFetch<Review>(`/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: Number(review.rating), comment: review.comment }),
      });
      setReviews((items) => [created, ...items]);
      setReview({ rating: "5", comment: "" });
      setMessage("Review submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit review.");
    }
  };

  const openWhatsAppCustomization = async () => {
    if (!product || isCustomizing) return;

    setIsCustomizing(true);

    try {
      const preview = await apiFetch<WhatsAppInquiryPreview>("/whatsapp/inquiry-preview", {
        method: "POST",
        body: JSON.stringify({
          productId: product._id,
          inquiryType: "custom-design-inquiry",
          notes: "Customization inquiry from the product page.",
        }),
      });

      const phoneNumber = getConfiguredWhatsAppPhoneNumber(preview.phoneNumber);
      if (!phoneNumber) {
        throw new Error("WhatsApp contact is unavailable right now.");
      }

      window.open(buildWhatsAppHref(phoneNumber, preview.message), "_blank", "noopener,noreferrer");
      toast.success("Opening WhatsApp");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Could not open WhatsApp.";
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsCustomizing(false);
    }
  };

  if (!product) {
    return <main className="min-h-screen bg-gray-100 p-6 text-gray-600 flex items-center justify-center">{message || "Loading product..."}</main>;
  }

  const showPrice = shouldShowPrice(product);
  const canCustomize = canCustomizeProduct(product);
  const resolvedModelUrl = product.model3dUrl ? getProductImageUrl(product.model3dUrl) : "";
  const supports3D = Boolean(product.model3dUrl && isBackendAssetUrl(resolvedModelUrl));

  return (
    <main className="min-h-screen bg-gray-100 pb-12">
      <div className="mx-auto max-w-7xl p-2 sm:p-3 md:p-6">
        {/* Breadcrumb */}
        <div className="mb-3">
          <p className="text-xs text-gray-500">
            Home / {getProductCategoryName(product.category)} / {product.name}
          </p>
        </div>

        {message ? (
          <div className="mb-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">{message}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* Image Gallery */}
          <section>
            {/* 3D Toggle */}
            {product.model3dUrl && !supports3D ? (
              <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
                3D preview unavailable. Use image gallery instead.
              </div>
            ) : null}

            {supports3D ? (
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('images')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    viewMode === 'images' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Images
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    viewMode === '3d' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  3D View
                </button>
              </div>
            ) : null}

            {/* Main Image */}
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              {viewMode === '3d' && supports3D ? (
                <Product3DViewer modelUrl={resolvedModelUrl} />
              ) : (
                <div className="p-0">
                  {/* ProductImageGallery will handle clicks and lightbox */}
                  <ProductImageGallery images={product.images || []} />
                </div>
              )}
            </div>

            {/* Thumbnails (legacy - hidden because ProductImageGallery provides its own thumbnails) */}
            <div className="mt-3 hidden grid-cols-5 gap-2">
              {(product.images || []).map((image, index) => {
                const imageUrl = getProductImageUrl(image);
                const altText = getProductImageAlt(image, `${product.name} ${index + 1}`);
                const isVideo = imageUrl.endsWith('.mp4') || imageUrl.endsWith('.webm');

                return (
                  <button
                    key={imageUrl || index}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`relative h-14 sm:h-16 overflow-hidden rounded-lg border-2 p-0.5 transition ${
                      selectedImage === index ? 'border-sky-500' : 'border-gray-200'
                    }`}
                  >
                    {imageUrl ? (
                      isVideo ? (
                        <video src={imageUrl} muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        <img
                          src={imageUrl}
                          alt={altText}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = '/mahabs-logo.svg';
                          }}
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-gray-100 text-xs text-gray-500">
                        No image
                      </div>
                    )}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4l12 6-12 6z"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Product Info */}
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-950">{product.name}</h1>
            
            {/* Rating & Stock */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-emerald-600 px-2 py-0.5 font-semibold text-white">
                {product.rating || 0}★
              </span>
              <span className="text-gray-500">
                {product.numReviews || reviews.length} reviews
              </span>
              <span className={`text-sm font-medium ${product.countInStock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {product.countInStock > 0 ? "In stock" : "Out of stock"}
              </span>
            </div>

            {/* Price */}
            {showPrice ? (
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-950">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
                )}
                {product.discountPercentage && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-bold text-emerald-700">
                    {product.discountPercentage}% off
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  This product is fully customizable. Contact us for a quote.
                </p>
              </div>
            )}
            {/* Pricing notice for stone/custom carved products */}
            <StonePricingNotice product={product} />

            {/* Action Buttons */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {showPrice ? (
                <>
                  <button 
                    onClick={addToCart} 
                    disabled={product.countInStock <= 0}
                    className="rounded-lg bg-sky-400 py-3 font-bold text-gray-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    Add to Cart
                  </button>
                  {getProductCategorySlug(product.category) === "home-decor" && (
                    <button
                      type="button"
                      onClick={() => {
                        setBuyNowCart([buildCartItemFromProduct(product, 1)]);
                        window.location.href = '/checkout?mode=buy-now';
                      }}
                      disabled={product.countInStock <= 0}
                      className="rounded-lg bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                    >
                      Buy Now
                    </button>
                  )}
                  <WishlistButton
                    productId={productId}
                    variant="full"
                    className="rounded-lg bg-white border border-gray-300"
                    onToggle={(saved) => setMessage(saved ? "Saved to wishlist." : "Removed from wishlist.")}
                  />
                  {canCustomize ? (
                    <button
                      type="button"
                      onClick={openWhatsAppCustomization}
                      disabled={isCustomizing}
                      className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] sm:col-span-2"
                    >
                      <MessageCircle className="h-5 w-5" />
                      {isCustomizing ? "Opening WhatsApp..." : "Customize this product"}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    onClick={openWhatsAppCustomization}
                    disabled={isCustomizing}
                    className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {isCustomizing ? "Opening WhatsApp..." : "Customize"}
                  </button>
                  <WishlistButton
                    productId={productId}
                    variant="full"
                    className="rounded-lg bg-white border border-gray-300"
                    onToggle={(saved) => setMessage(saved ? "Saved to wishlist." : "Removed from wishlist.")}
                  />
                </>
              )}
            </div>

            {/* Trust Badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">Free returns</span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700">Secure checkout</span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700">Verified seller</span>
            </div>

            {/* Description */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h2 className="font-bold text-gray-950">Product Details</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">{product.description}</p>
              
              {/* Specs */}
              {product.specs?.length ? (
                <ul className="mt-4 grid gap-2 text-sm text-gray-700">
                  {product.specs.map((spec) => (
                    <li key={spec} className="rounded-lg bg-gray-50 px-3 py-2">{spec}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        </div>

        {/* Reviews Section */}
        <section className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">Reviews & Ratings</h2>
          
          {/* Review Form */}
          <form onSubmit={submitReview} className="mt-4 grid gap-3">
            <div className="grid grid-cols-[100px_1fr_auto] gap-2">
              <select 
                value={review.rating} 
                onChange={(event) => setReview({ ...review, rating: event.target.value })} 
                className="customer-input rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
              </select>
              <input 
                value={review.comment} 
                onChange={(event) => setReview({ ...review, comment: event.target.value })} 
                className="customer-input rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" 
                placeholder="Share your experience" 
              />
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                Submit
              </button>
            </div>
          </form>

          {/* Reviews List */}
          <div className="mt-4 grid gap-3">
            {reviews.length ? (
              reviews.map((item) => (
                <article key={item._id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-950">{item.name}</span>
                    <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white">{item.rating}★</span>
                    {item.verifiedPurchase && (
                      <span className="text-xs font-semibold text-emerald-700">Verified purchase</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{item.comment}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-gray-500">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </section>

        {/* Related Products */}
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold text-gray-950">Customers also bought</h2>
          <div className="product-grid-mobile">
            {related.map((item) => <ProductCard key={item._id} product={item} compact />)}
          </div>
        </section>
      </div>
    </main>
  );
}
