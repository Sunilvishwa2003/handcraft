"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Chatbot from "@/components/Chatbot";
import ProductCard from "@/components/ProductCard";
import { apiFetch, getRecentlyViewed, getStoredUser, resolveAssetUrl } from "@/lib/api";
import { getCategoryDisplayName, getProductCategorySlug, isStorefrontCategoryVisible } from "@/lib/catalog";
import { Product } from "@/lib/types";

type HomeAd = {
  _id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  targetUrl: string;
  active?: boolean;
  sortOrder?: number;
  productId?: string;
};

type HomePayload = {
  recommended: Product[];
  trending: Product[];
  bestSellers: Product[];
  newest: Product[];
  ads: HomeAd[];
};

type HomeSlide = {
  id: string;
  title: string;
  description?: string;
  link: string;
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
};

const emptyHome: HomePayload = {
  recommended: [],
  trending: [],
  bestSellers: [],
  newest: [],
  ads: [],
};

const heroStudioCards = [
  {
    title: "Premium natural stone craftsmanship",
    description: "Every piece is carved, finished, and polished to reflect lasting luxury and tactile heritage.",
  },
  {
    title: "Fully customized designs",
    description: "Tailored stone name boards, memorial plaques, and temple accents shaped to your vision.",
  },
  {
    title: "Safe delivery across India",
    description: "Secure packaging, trusted logistics, and careful handling from studio to doorstep.",
  },
];

export default function Home() {
  const [home, setHome] = useState<HomePayload>(emptyHome);
  const [loading, setLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    const user = getStoredUser();
    const userQuery = user?._id ? `?userId=${user._id}` : "";
    apiFetch<HomePayload>(`/ai/homepage${userQuery}`)
      .then(setHome)
      .catch(() => setHome(emptyHome))
      .finally(() => setLoading(false));

    const frame = window.requestAnimationFrame(() => {
      setRecentlyViewed(getRecentlyViewed());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const categories = useMemo(() => {
    const all = [...home.recommended, ...home.trending, ...home.bestSellers, ...home.newest];
    const found = new Map<string, string>();

    all.forEach((product) => {
      const slug = getProductCategorySlug(product.category);
      const label = getCategoryDisplayName(slug);
      if (slug && isStorefrontCategoryVisible(label) && !found.has(slug)) {
        found.set(slug, label);
      }
    });

    return Array.from(found.entries()).slice(0, 8).map(([slug, label]) => ({ slug, label }));
  }, [home]);

  const categoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      Stone: '🪨',
      'Stone Art': '🪨',
      Wood: '🪵',
      'Wood Craft': '🪵',
      Metal: '⚙️',
      'Metal Work': '⚙️',
      Ceramic: '🏺',
      'Blown Glass': '✨',
      Glass: '✨',
      'Home Decor': '🏡',
      Gifts: '🎁',
      Kitchen: '🍽️',
      Garden: '🌿',
      Jewelry: '💍',
      Textiles: '🧵',
    };
    return icons[category] || '🛍️';
  };

  const sliderSlides = useMemo<HomeSlide[]>(
    () =>
      [...home.ads]
        .filter((ad) => ad.active !== false && ad.imageUrl?.trim())
        .sort((left, right) => (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER))
        .map((ad, index) => ({
          id: ad._id || `admin-ad-${index}`,
          title: ad.title?.trim() || "Featured ad",
          description: ad.description?.trim() || undefined,
          link: ad.targetUrl || (ad.productId ? `/products/${ad.productId}` : "/products"),
          desktopImage: resolveAssetUrl(ad.desktopImage || ad.imageUrl),
          tabletImage: resolveAssetUrl(ad.tabletImage || ad.desktopImage || ad.imageUrl),
          mobileImage: resolveAssetUrl(ad.mobileImage || ad.desktopImage || ad.imageUrl),
        })),
    [home.ads]
  );

  const uniqueProducts = (products: Product[]) =>
    products.filter((product, index, all) => all.findIndex((item) => item._id === product._id) === index);

  const [activeSlide, setActiveSlide] = useState(0);
  const slidesCount = sliderSlides.length;
  const currentSlideIndex = slidesCount ? activeSlide % slidesCount : 0;

  useEffect(() => {
    if (slidesCount < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % slidesCount);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [currentSlideIndex, slidesCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (slidesCount ? current % slidesCount : 0));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [slidesCount]);

  const handleSliderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!slidesCount) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveSlide((current) => (current - 1 + slidesCount) % slidesCount);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveSlide((current) => (current + 1) % slidesCount);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveSlide(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveSlide(slidesCount - 1);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 pb-16 sm:pb-12">
      <section className="relative isolate overflow-hidden bg-linear-to-b from-slate-950 via-slate-950 to-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,205,96,0.16),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(255,229,168,0.06),transparent_20%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(8,11,18,0.96))]" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_24px,rgba(255,255,255,0.03)_25px),repeating-linear-gradient(90deg,transparent,transparent_24px,rgba(255,255,255,0.03)_25px)] opacity-10" />
        <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute right-8 top-24 h-72 w-72 rounded-full bg-slate-200/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.85fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-slate-200/80 backdrop-blur-md shadow-sm">
                MAHABS CRAFTO • HANDCRAFTED STONE ART
              </div>

              <h1 className="mt-8 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-[5.2rem]">
                Heritage Carved in Stone
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Custom stone name boards, memorial plaques, temple carvings, and décor pieces crafted with timeless artistry.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/products?category=${encodeURIComponent(getProductCategorySlug("Stone"))}`}
                  className="inline-flex items-center justify-center rounded-[28px] bg-linear-to-r from-amber-300 via-amber-200 to-amber-400 px-8 py-4 text-sm font-semibold text-slate-950 shadow-[0_24px_60px_rgba(245,158,11,0.22)] transition duration-300 hover:-translate-y-0.5"
                >
                  Shop Collection
                </Link>
                <Link
                  href="/custom-order"
                  className="inline-flex items-center justify-center rounded-[28px] border border-white/25 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition duration-300 hover:bg-white/15"
                >
                  Start Custom Order
                </Link>
              </div>
            </div>

            <div className="relative rounded-4xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_rgba(8,12,20,0.45)] backdrop-blur-2xl">
              <div className="absolute inset-0 rounded-4xl bg-[linear-gradient(135deg,rgba(245,205,96,0.12),transparent_42%)]" />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.34em] text-amber-200/85">
                  Why Choose Us
                </p>
                <div className="mt-6 space-y-4">
                  {heroStudioCards.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[26px] border border-white/10 bg-slate-950/40 p-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)]"
                    >
                      <p className="text-base font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-highlights-heading" className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p id="home-highlights-heading" className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-600">Curated picks</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold text-slate-950 md:text-4xl">Handpicked for you.</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-gray-700">
            <span className="rounded-full bg-gray-100 px-3 py-2">Admin ads first</span>
            <span className="rounded-full bg-gray-100 px-3 py-2">Keyboard accessible</span>
          </div>
        </div>
        {slidesCount ? (
          <div
            className="relative overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-xl shadow-slate-200/30 transition-colors duration-300 dark:border-slate-700/50 dark:bg-slate-950 dark:shadow-black/10"
            aria-label="Homepage advertisements"
          >
            <div
              className="relative outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              onKeyDown={handleSliderKeyDown}
              tabIndex={0}
            >
              <div
                className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
                style={{ transform: `translate3d(-${currentSlideIndex * 100}%, 0, 0)` }}
              >
                {sliderSlides.map((slide, index) => (
                  <article
                    key={slide.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Slide ${index + 1} of ${slidesCount}${slide.title ? `: ${slide.title}` : ""}`}
                    className="relative w-full shrink-0"
                  >
                      <div className="relative w-full overflow-hidden rounded-2xl h-[220px] md:h-[350px] lg:h-[550px] bg-slate-100 dark:bg-slate-900">
                        <picture>
                          <source media="(max-width: 767px)" srcSet={slide.mobileImage || slide.desktopImage} />
                          <source media="(max-width: 1023px)" srcSet={slide.tabletImage || slide.desktopImage} />
                          <img
                            src={slide.desktopImage}
                            alt={slide.title}
                            className="w-full h-full object-cover object-center"
                            decoding={index === 0 ? "sync" : "async"}
                            fetchPriority={index === 0 ? "high" : "auto"}
                            loading={index === 0 ? "eager" : "lazy"}
                            sizes="(min-width: 1280px) 1200px, (min-width: 1024px) 100vw, (min-width: 640px) 92vw, 100vw"
                          />
                        </picture>
                        <div className="absolute inset-0 bg-linear-to-t from-slate-950/78 via-slate-950/18 to-slate-950/6" />
                      </div>
                  </article>
                ))}
              </div>

              {slidesCount > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={() => setActiveSlide((current) => (current - 1 + slidesCount) % slidesCount)}
                    className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/92 text-slate-700 shadow-lg shadow-slate-200/30 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700/60 dark:bg-slate-900/92 dark:text-slate-100 dark:shadow-black/20 dark:focus-visible:ring-offset-slate-950 sm:left-4"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">‹</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => setActiveSlide((current) => (current + 1) % slidesCount)}
                    className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/92 text-slate-700 shadow-lg shadow-slate-200/30 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700/60 dark:bg-slate-900/92 dark:text-slate-100 dark:shadow-black/20 dark:focus-visible:ring-offset-slate-950 sm:right-4"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">›</span>
                  </button>

                  <div className="absolute inset-x-0 bottom-1 z-20 flex justify-center gap-1 sm:bottom-2 sm:gap-2">
                    {sliderSlides.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        aria-label={`Show slide ${index + 1}`}
                        aria-current={index === currentSlideIndex ? "true" : undefined}
                        aria-pressed={index === currentSlideIndex}
                        className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                      >
                        <span
                          className={`block rounded-full transition-all duration-300 ${
                            index === currentSlideIndex
                              ? "h-2.5 w-6 bg-sky-500 shadow-[0_0_0_8px_rgba(56,189,248,0.16)]"
                              : "h-2.5 w-2.5 bg-white/75 dark:bg-slate-500"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              <div aria-live="polite" aria-atomic="true" className="sr-only">
                Slide {currentSlideIndex + 1} of {slidesCount}: {sliderSlides[currentSlideIndex]?.title}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No live ads right now</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Published banners from the admin dashboard will appear here automatically when they are available.
                </p>
              </div>
              <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                Ad slot ready
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-8">
        <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
        {categories.length ? (
          categories.map((category) => (
            <Link
              key={category.slug}
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-slate-50"
            >
              <span>{categoryIcon(category.label)}</span>
              <span>{category.label}</span>
            </Link>
          ))
        ) : (
          ["Top offers", "Decor", "Gifts", "Kitchen", "Garden"].map((category) => (
            <Link
              key={category}
              href={`/products?category=${encodeURIComponent(category)}`}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-slate-50"
            >
              <span>{categoryIcon(category)}</span>
              <span>{category}</span>
            </Link>
          ))
        )}
      </div>
      </section>

      {recentlyViewed.length ? (
        <ProductSection title="Recently viewed" products={uniqueProducts(recentlyViewed)} loading={false} />
      ) : null}

      <ProductSection title="Recommended for you" products={uniqueProducts(home.recommended)} loading={loading} />
      <ProductSection title="Trending now" products={uniqueProducts(home.trending)} loading={loading} />
      <ProductSection title="Customers keep buying" products={uniqueProducts(home.bestSellers)} loading={loading} />
      <ProductSection title="Newest arrivals" products={uniqueProducts(home.newest)} loading={loading} />
      <Chatbot />
    </main>
  );
}

function ProductSection({ title, products, loading }: { title: string; products: Product[]; loading: boolean }) {
  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 md:px-8">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-950">{title}</h2>
        <Link href="/products" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="rounded-md bg-white p-6 text-sm text-gray-500">Loading products...</div>
      ) : products.length ? (
        <div className="product-grid-mobile">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} compact />
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-white p-6 text-sm text-gray-500">
          Add products from the admin dashboard to populate this section.
        </div>
      )}
    </section>
  );
}

