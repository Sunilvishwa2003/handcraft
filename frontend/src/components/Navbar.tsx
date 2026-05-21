"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, UserRound } from 'lucide-react';
import { apiFetch, getApiUrl, getGuestCart } from '@/lib/api';
import { useStoredUser } from '@/hooks/useStoredUser';
import useMenu from '@/hooks/useMenu';
import { isAdmin as isAdminEmail } from '@/lib/isAdmin';
import { getCategoryDisplayName, getProductCategorySlug, storefrontFeaturedCategories } from '@/lib/catalog';
import { Cart } from '@/lib/types';
import NotificationBell from './NotificationBell';

const NAVBAR_LOGO_SRC = '/est-1982-navbar-logo.svg';
const NAVBAR_LOGO_FALLBACK = '/mahabs-logo.svg';

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ _id: string; name: string; brand: string; category: string; vendorName?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimer = useRef<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const user = useStoredUser();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isLoggedIn = Boolean(user?.token);
  const userIsAdmin = isAdminEmail(user?.email);
  const menuQuery = useMenu();
  const categories = useMemo(() => {
    const source = menuQuery.isLoading ? [] : menuQuery.data?.length ? menuQuery.data : storefrontFeaturedCategories;
    const map = new Map<string, string>();

    source.forEach((category) => {
      const slug = getProductCategorySlug(category);
      if (!slug || map.has(slug)) {
        return;
      }
      map.set(slug, getCategoryDisplayName(category));
    });

    return Array.from(map.values());
  }, [menuQuery.data, menuQuery.isLoading]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      if (user?.token) {
        try {
          const cart = await apiFetch<Cart>('/cart');
          if (!mounted) return;
          setCartCount(cart.items.reduce((sum, item) => sum + item.qty, 0));
          return;
        } catch {
          // If the token is stale, fall back to guest cart count.
        }
      }

      if (!mounted) return;
      setCartCount(getGuestCart().items.reduce((sum, item) => sum + item.qty, 0));
    };

    void refresh();
    window.addEventListener('cart:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('cart:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.token]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    if (suggestionTimer.current) {
      window.clearTimeout(suggestionTimer.current);
    }

    suggestionTimer.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`${getApiUrl()}/products/suggestions?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => {
      if (suggestionTimer.current) {
        window.clearTimeout(suggestionTimer.current);
      }
    };
  }, [query]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/products?q=${encodeURIComponent(query)}`);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);

    if (!value.trim()) {
      if (suggestionTimer.current) {
        window.clearTimeout(suggestionTimer.current);
      }
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <nav className="bg-[#131921] text-white shadow-md sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 overflow-x-hidden">
        {/* Main Navbar Row */}
        <div className="flex items-center gap-2 py-2 min-h-[3.5rem] md:min-h-[5.25rem] min-w-0">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 md:gap-3 font-bold leading-none shrink-0" 
            style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
          >
            <div className="relative h-10 w-10 sm:h-16 sm:w-16 md:h-20 md:w-20 shrink-0">
              <img
                src={NAVBAR_LOGO_SRC}
                alt="MahabsCrafto logo"
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = NAVBAR_LOGO_FALLBACK;
                }}
              />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="tracking-tight text-[clamp(1.1rem,5vw,2.8rem)] sm:text-[clamp(1.6rem,4vw,3.25rem)] md:text-5xl truncate whitespace-nowrap">
                MahabsCrafto
              </span>
              <span className="text-sky-300 text-[10px] md:text-xs font-normal tracking-normal hidden sm:block">
                Ancient Art. Modern Soul.
              </span>
            </div>
          </Link>

          {/* Search Bar - Compact on mobile, full on desktop */}
          <form onSubmit={submitSearch} className="flex-1 min-w-0 max-w-xl mx-auto hidden sm:block md:flex-[1.2]">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(125,211,252,0.35),rgba(255,255,255,0.97)_40%,rgba(56,189,248,0.2))] shadow-[0_20px_45px_rgba(2,6,23,0.34)]" />
              <div className="relative flex items-center gap-2 rounded-full border border-white/30 bg-white/95 px-3 py-2 backdrop-blur-sm transition duration-200 focus-within:border-sky-300 focus-within:shadow-[0_0_0_3px_rgba(125,211,252,0.26)]">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="w-full border-0 bg-transparent py-1 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  aria-label="Search site"
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-slate-950 px-3 text-sm font-semibold text-white transition duration-200 hover:bg-sky-500"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              {showSuggestions && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-sky-100/80 bg-white/95 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                  <div className="max-h-72 overflow-y-auto rounded-xl">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion._id}
                        type="button"
                        onMouseDown={() => {
                          router.push(`/products/${suggestion._id}`);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-sky-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{suggestion.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500 truncate">
                              {suggestion.brand} · {suggestion.category}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto shrink min-w-0">
            {/* Notification Bell */}
            <div className="hidden sm:block">
              <NotificationBell />
            </div>

            {/* Cart */}
            <Link 
              href="/cart" 
              aria-label="Shopping cart"
              className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 min-h-[44px] min-w-[44px] text-sm font-semibold hover:bg-white/20 justify-center"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden md:inline">Cart</span>
              {cartCount ? (
                <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] md:text-xs font-bold text-white min-w-[1.25rem] text-center">
                  {cartCount}
                </span>
              ) : null}
            </Link>

            {isLoggedIn ? (
              <Link
                href="/profile"
                aria-label="User profile"
                className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 text-sm font-semibold text-white transition hover:bg-white/20 hover:text-sky-200 justify-center"
              >
                <UserRound className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            ) : (
              <Link
                href="/account"
                aria-label="Login"
                className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full bg-white px-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 justify-center"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}

            {/* Admin Dashboard - Desktop */}
            {userIsAdmin && (
              <Link
                href="/admin"
                aria-label="Admin dashboard"
                className={`hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isAdminRoute
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            {isLoggedIn && user?.name ? (
              <span className="hidden xl:inline text-sm text-sky-100/85">Hi, {user.name.split(' ')[0]}</span>
            ) : null}
          </div>
        </div>

        {/* Mobile Search Bar - Visible only on mobile */}
        <div className="sm:hidden pb-2">
          <form onSubmit={submitSearch} className="relative">
            <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/95 px-3 py-2 backdrop-blur-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sky-300">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search products, brands, materials..."
                aria-label="Search products"
                className="w-full border-0 bg-transparent py-0.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
              />
            </div>
            {userIsAdmin && (
              <div className="mt-2">
                <Link
                  href="/admin"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition-all ${
                    isAdminRoute
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-white hover:bg-white/10 hover:text-sky-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </Link>
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-sky-100 bg-white p-2 shadow-lg">
                {suggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion._id}
                    type="button"
                    onMouseDown={() => router.push(`/products/${suggestion._id}`)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-sky-50"
                  >
                    <div className="truncate font-semibold text-slate-900">{suggestion.name}</div>
                    <div className="text-xs text-slate-500">{suggestion.brand}</div>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Category Navigation - Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-2 pb-2 pt-1 overflow-x-auto hide-scrollbar px-2">
          {menuQuery.isLoading ? (
            [1, 2, 3, 4].map((index) => (
              <div key={index} className="h-8 min-w-[6rem] rounded-full bg-slate-200 animate-pulse" />
            ))
          ) : categories.length ? (
            categories.map((cat) => (
              <Link
                key={cat}
                href={`/products?category=${encodeURIComponent(cat)}`}
                className="shrink-0 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 px-4 py-1.5 text-xs md:text-sm font-bold text-gray-300 hover:text-sky-400 hover:border-sky-500/50 transition-colors duration-300 whitespace-nowrap"
              >
                {cat}
              </Link>
            ))
          ) : (
            <div className="text-sm text-gray-500">No categories available.</div>
          )}
        </div>
      </div>
    </nav>
  );
}
