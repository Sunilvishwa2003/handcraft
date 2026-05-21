"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { apiFetch, formatPrice, getProductPrimaryImageUrl, resolveAssetUrl } from "@/lib/api";
import { getCategoryDisplayName, getProductCategorySlug, isStorefrontCategoryVisible } from "@/lib/catalog";
import { Ad, Product, ProductListResponse } from "@/lib/types";
import { useSearchParams } from "next/navigation";

type Facets = {
  categories: string[];
  brands: string[];
  priceRange: { min: number; max: number };
};

type ProductSlide = {
  id: string;
  title: string;
  description: string;
  href: string;
  imageUrl: string;
  priceLabel: string;
  brand: string;
};

type CategoryAdSlide = {
  id: string;
  title: string;
  href: string;
  desktopImage: string;
  tabletImage: string;
  mobileImage: string;
};

type CategorySliderSlide = ProductSlide | CategoryAdSlide;

const isCategoryAdSlide = (slide: CategorySliderSlide): slide is CategoryAdSlide => "desktopImage" in slide;
const getDesktopSlideImage = (slide: CategorySliderSlide) => (isCategoryAdSlide(slide) ? slide.desktopImage : slide.imageUrl);
const getTabletSlideImage = (slide: CategorySliderSlide) => (isCategoryAdSlide(slide) ? slide.tabletImage || slide.desktopImage : slide.imageUrl);
const getMobileSlideImage = (slide: CategorySliderSlide) => (isCategoryAdSlide(slide) ? slide.mobileImage || slide.desktopImage : slide.imageUrl);

const sorts = [
  ["relevance", "Relevance"],
  ["best-seller", "Best seller"],
  ["trending", "Trending"],
  ["newest", "Newest"],
  ["highest-rated", "Highest rated"],
  ["price-low", "Price low to high"],
  ["price-high", "Price high to low"],
];

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryAds, setCategoryAds] = useState<Ad[]>([]);
  const [categoryAdsLoading, setCategoryAdsLoading] = useState<boolean>(false);
  const [facets, setFacets] = useState<Facets>({ categories: [], brands: [], priceRange: { min: 0, max: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategorySlide, setActiveCategorySlide] = useState(0);
  const [query, setQuery] = useState({
    q: "",
    category: "all",
    brand: "all",
    minPrice: "",
    maxPrice: "",
    rating: "",
    availability: "",
    sort: "relevance",
  });

  useEffect(() => {
    document.body.style.overflow = isFilterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFilterOpen]);

  const searchParamsHook = useSearchParams();

  useEffect(() => {
    setQuery((current) => ({
      ...current,
      q: searchParamsHook.get("q") || "",
      category: searchParamsHook.get("category") || "all",
    }));
  }, [searchParamsHook]);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      }
    });
    return params.toString();
  }, [query]);

  const selectedCategory = query.category?.trim() || "";
  const selectedCategoryLabel = selectedCategory ? getCategoryDisplayName(selectedCategory) : "";
  const shouldShowCategorySlider =
    Boolean(selectedCategory) &&
    selectedCategory.toLowerCase() !== "all" &&
    selectedCategory.toLowerCase() !== "home decor";

  useEffect(() => {
    apiFetch<Facets>("/products/facets").then(setFacets).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedCategory || selectedCategory.toLowerCase() === "all") {
      setCategoryAds([]);
      return;
    }

    setCategoryAdsLoading(true);
    apiFetch<{ placement: string; ads: Ad[] }>(`/ai/slider-ads?placement=${encodeURIComponent(selectedCategory)}`)
      .then((data) => setCategoryAds(Array.isArray(data.ads) ? data.ads : []))
      .catch(() => setCategoryAds([]))
      .finally(() => setCategoryAdsLoading(false));
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch<ProductListResponse>(`/products?${searchParams}`)
      .then((data) => {
        setProducts(data.products);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load products"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const activeFilters = useMemo(() => {
    const filters: { label: string; key: string }[] = [];
    if (query.q) filters.push({ label: `Search: ${query.q}`, key: 'q' });
    if (query.category && query.category !== 'all') filters.push({ label: `Category: ${getCategoryDisplayName(query.category)}`, key: 'category' });
    if (query.brand && query.brand !== 'all') filters.push({ label: `Brand: ${query.brand}`, key: 'brand' });
    if (query.rating) filters.push({ label: `Rating: ${query.rating}+`, key: 'rating' });
    if (query.availability) filters.push({ label: `Availability: ${query.availability.replace('-', ' ')}`, key: 'availability' });
    if (query.minPrice || query.maxPrice) filters.push({ label: `Price: ${query.minPrice || '0'} - ${query.maxPrice || 'Any'}`, key: 'price' });
    return filters;
  }, [query]);

  const visibleCategories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    facets.categories.forEach((category) => {
      const slug = getProductCategorySlug(category);
      const label = getCategoryDisplayName(slug);
      if (slug && isStorefrontCategoryVisible(label) && !categoryMap.has(slug)) {
        categoryMap.set(slug, label);
      }
    });

    if (query.category && query.category !== "all") {
      const slug = getProductCategorySlug(query.category);
      const label = getCategoryDisplayName(slug);
      if (slug && isStorefrontCategoryVisible(label) && !categoryMap.has(slug)) {
        categoryMap.set(slug, label);
      }
    }

    return Array.from(categoryMap.entries()).map(([slug, label]) => ({ slug, label }));
  }, [facets.categories, query.category]);

  const clearFilter = (key: string) => {
    setQuery((current) => {
      if (key === 'price') {
        return {
          ...current,
          minPrice: '',
          maxPrice: '',
        };
      }

      return {
        ...current,
        [key]: key === 'category' || key === 'brand' ? 'all' : '',
      };
    });
  };

  const clearAllFilters = () => {
    setQuery({ q: '', category: 'all', brand: 'all', minPrice: '', maxPrice: '', rating: '', availability: '', sort: 'relevance' });
  };

  const categorySlides = useMemo<ProductSlide[]>(() => {
    if (!shouldShowCategorySlider) {
      return [];
    }

    return products
      .slice(0, 5)
      .map((product) => {
        return {
          id: product._id,
          title: product.name,
          description:
            product.description.length > 180 ? `${product.description.slice(0, 177).trimEnd()}...` : product.description,
          href: `/products/${product._id}`,
          imageUrl: getProductPrimaryImageUrl(product),
          priceLabel: formatPrice(product.price),
          brand: product.brand,
        };
      });
  }, [products, shouldShowCategorySlider]);

  const categoryAdSlides = useMemo<CategoryAdSlide[]>(
    () =>
      categoryAds
        .filter((ad) => ad.active !== false && (ad.imageUrl || ad.desktopImage || ad.tabletImage || ad.mobileImage))
        .sort((left, right) => (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER))
        .map((ad, index) => ({
          id: ad._id || `category-ad-${index}`,
          title: ad.title?.trim() || "Featured ad",
          href: ad.targetUrl || (ad.productId ? `/products/${ad.productId}` : "/products"),
          desktopImage: resolveAssetUrl(ad.desktopImage || ad.imageUrl),
          tabletImage: resolveAssetUrl(ad.tabletImage || ad.desktopImage || ad.imageUrl),
          mobileImage: resolveAssetUrl(ad.mobileImage || ad.desktopImage || ad.imageUrl),
        })),
    [categoryAds],
  );

  const sliderSlides: CategorySliderSlide[] = categoryAdSlides.length ? categoryAdSlides : categorySlides;
  const categorySlidesCount = sliderSlides.length;
  const currentCategorySlideIndex = categorySlidesCount ? activeCategorySlide % categorySlidesCount : 0;

  useEffect(() => {
    setActiveCategorySlide(0);
  }, [selectedCategory, categorySlidesCount]);

  useEffect(() => {
    if (categorySlidesCount < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActiveCategorySlide((current) => (current + 1) % categorySlidesCount);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [activeCategorySlide, categorySlidesCount]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    window.history.replaceState(null, "", `/products?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-2 sm:p-3 md:p-6">
      <div className="mx-auto max-w-7xl min-w-0">
        {/* Mobile Filter Toggle & Sort Bar - Sticky */}
        <div className="sticky top-[120px] sm:top-[140px] z-20 bg-slate-50/95 backdrop-blur-sm py-2 mb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilters.length > 0 && (
                <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {activeFilters.length}
                </span>
              )}
            </button>

            <div className="flex-1 lg:flex-none">
              <select 
                value={query.sort} 
                onChange={(event) => setQuery({ ...query, sort: event.target.value })} 
                className="w-full lg:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 shadow-sm"
              >
                {sorts.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {activeFilters.length > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="hidden sm:inline-flex rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
          {/* Mobile Filter Overlay */}
          <div 
            className={`fixed inset-0 z-30 bg-slate-950/50 transition-opacity duration-300 lg:hidden ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setIsFilterOpen(false)} 
          />
          
          {/* Filter Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-full max-w-xs transform overflow-y-auto rounded-r-2xl border-r border-slate-200 bg-white p-4 shadow-2xl transition duration-300 ease-out lg:sticky lg:top-32 lg:z-0 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:inset-auto lg:translate-x-0 lg:overflow-visible lg:rounded-none lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-950">Filters</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuery({ q: "", category: "all", brand: "all", minPrice: "", maxPrice: "", rating: "", availability: "", sort: query.sort })}
                  className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 lg:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-4 lg:mt-0 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:p-4">
              {/* Search */}
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Search</span>
                <input 
                  value={query.q} 
                  onChange={(event) => setQuery({ ...query, q: event.target.value })} 
                  className="customer-input mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-950 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" 
                  placeholder="Search products..."
                />
              </label>

              {/* Category */}
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Category</span>
                <select 
                  value={query.category} 
                  onChange={(event) => setQuery({ ...query, category: event.target.value })} 
                  className="customer-input mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-950 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">All categories</option>
                  {visibleCategories.map((option) => (
                    <option key={option.slug} value={option.slug}>{option.label}</option>
                  ))}
                </select>
              </label>

              {/* Brand */}
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Brand</span>
                <select 
                  value={query.brand} 
                  onChange={(event) => setQuery({ ...query, brand: event.target.value })} 
                  className="customer-input mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-950 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">All brands</option>
                  {facets.brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </label>

              {/* Price Range */}
              <div>
                <span className="text-sm font-semibold text-gray-700">Price Range</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-gray-500">Min</span>
                    <input 
                      value={query.minPrice} 
                      onChange={(event) => setQuery({ ...query, minPrice: event.target.value })} 
                      className="customer-input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" 
                      placeholder="0"
                      type="number"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">Max</span>
                    <input 
                      value={query.maxPrice} 
                      onChange={(event) => setQuery({ ...query, maxPrice: event.target.value })} 
                      className="customer-input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" 
                      placeholder="Any"
                      type="number"
                    />
                  </label>
                </div>
              </div>

              {/* Rating */}
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Rating</span>
                <select 
                  value={query.rating} 
                  onChange={(event) => setQuery({ ...query, rating: event.target.value })} 
                  className="customer-input mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-950 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">Any rating</option>
                  <option value="4">4★ & above</option>
                  <option value="3">3★ & above</option>
                </select>
              </label>

              {/* Availability */}
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Availability</span>
                <select 
                  value={query.availability} 
                  onChange={(event) => setQuery({ ...query, availability: event.target.value })} 
                  className="customer-input mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-950 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">Any availability</option>
                  <option value="in-stock">In stock</option>
                  <option value="preorder">Preorder</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>
              </label>

              {/* Apply Button */}
              <button 
                type="submit"
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Apply filters
              </button>
            </form>
          </aside>

          {/* Main Content */}
          <section className="min-w-0 overflow-hidden rounded-xl bg-white p-3 shadow-sm sm:p-4">
            {/* Breadcrumb & Title */}
            <div className="border-b border-gray-100 pb-3 mb-3">
              <p className="text-xs text-gray-500">Home / Products</p>
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-lg sm:text-xl font-bold text-gray-950">Products</h1>
                <p className="text-sm text-gray-500">
                  {selectedCategory && selectedCategory.toLowerCase() !== 'all'
                    ? `Showing ${total} product${total === 1 ? '' : 's'} in ${selectedCategoryLabel}`
                    : `${total} product${total === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            {/* Category Slider */}
            {categoryAdsLoading && shouldShowCategorySlider ? (
              <div className="mt-4 rounded-lg bg-gray-50 p-6 text-sm text-gray-500 text-center">Loading category highlights...</div>
            ) : sliderSlides.length ? (
              <section className="relative mt-4 overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-xl shadow-slate-200/30 transition-colors duration-300 dark:border-slate-700/50 dark:bg-slate-950 dark:shadow-black/10">
                <div
                  className="flex transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${currentCategorySlideIndex * 100}%)` }}
                >
                  {sliderSlides.map((slide, index) => (
                    <article
                      key={slide.id}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`Slide: ${slide.title}`}
                      className="relative min-h-[200px] sm:min-h-[280px] w-full shrink-0 overflow-hidden"
                    >
                      <Link href={slide.href} aria-label={`Open ${slide.title}`} className="absolute inset-0 z-10" />
                      <div className="relative w-full overflow-hidden h-[220px] md:h-[350px] lg:h-[550px] bg-slate-100">
                        <picture>
                          <source
                            media="(max-width: 767px)"
                            srcSet={getMobileSlideImage(slide)}
                          />
                          <source
                            media="(max-width: 1023px)"
                            srcSet={getTabletSlideImage(slide)}
                          />
                          <img
                            src={getDesktopSlideImage(slide)}
                            alt={slide.title}
                            className="w-full h-full object-cover object-center"
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding={index === 0 ? "sync" : "async"}
                            fetchPriority={index === 0 ? "high" : "auto"}
                            sizes="(min-width: 1280px) 1200px, (min-width: 1024px) 100vw, (min-width: 768px) 92vw, 100vw"
                          />
                        </picture>
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/15 to-slate-950/80" />
                      </div>
                      <span className="sr-only">{slide.title}</span>
                    </article>
                  ))}
                </div>

                {categorySlidesCount > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous category slide"
                      onClick={() => setActiveCategorySlide((current) => (current - 1 + categorySlidesCount) % categorySlidesCount)}
                      className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/92 text-slate-700 shadow-lg shadow-slate-200/30 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700/60 dark:bg-slate-900/92 dark:text-slate-100 dark:shadow-black/20 dark:focus-visible:ring-offset-slate-950 sm:left-4"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">‹</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Next category slide"
                      onClick={() => setActiveCategorySlide((current) => (current + 1) % categorySlidesCount)}
                      className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/92 text-slate-700 shadow-lg shadow-slate-200/30 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700/60 dark:bg-slate-900/92 dark:text-slate-100 dark:shadow-black/20 dark:focus-visible:ring-offset-slate-950 sm:right-4"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">›</span>
                    </button>
                    <div className="absolute inset-x-0 bottom-1 z-20 flex justify-center gap-1 sm:bottom-2 sm:gap-2">
                      {sliderSlides.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveCategorySlide(index)}
                          aria-label={`Show slide ${index + 1}`}
                          aria-current={index === currentCategorySlideIndex ? "true" : undefined}
                          aria-pressed={index === currentCategorySlideIndex}
                          className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                        >
                          <span
                            className={`block rounded-full transition-all duration-300 ${
                              index === currentCategorySlideIndex
                                ? "h-2.5 w-6 bg-sky-500 shadow-[0_0_0_8px_rgba(56,189,248,0.16)]"
                                : "h-2.5 w-2.5 bg-white/75 dark:bg-slate-500"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {/* Active Filters */}
            {activeFilters.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => clearFilter(filter.key)}
                    className="max-w-full rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                  >
                    {filter.label} ×
                  </button>
                ))}
                <button 
                  type="button" 
                  onClick={clearAllFilters} 
                  className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear all
                </button>
              </div>
            ) : null}

            {/* Error Message */}
            {error ? (
              <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : null}

            {/* Loading State */}
            {loading ? (
              <div className="mt-4 rounded-lg bg-gray-50 p-6 text-sm text-gray-500 text-center">Loading products...</div>
            ) : products.length ? (
              /* Product Grid - Mobile First 2 Column Layout */
              <div className="mt-4 product-grid-mobile">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-gray-50 p-6 text-sm text-gray-500 text-center">
                {selectedCategory && selectedCategory.toLowerCase() !== 'all'
                  ? 'No products found in this category.'
                  : 'No products match these filters.'}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 p-6 text-gray-500 flex items-center justify-center">Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
