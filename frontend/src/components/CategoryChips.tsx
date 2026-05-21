"use client";

import { motion, type Variants, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type LucideIcon,
  Mountain,
  Hammer,
  Trees,
  Home,
  PenSquare,
  Gem,
  ShoppingBag,
  Gift,
  Utensils,
  Sprout,
  BadgeCheck,
} from "lucide-react";
import React from "react";
import { storefrontFeaturedCategories } from "@/lib/catalog";

// Icon mapping for categories
const categoryIcons: Record<string, LucideIcon> = {
  Stone: Mountain,
  "Stone Art": Mountain,
  "Stone Name Board": PenSquare,
  Metal: Hammer,
  "Metal Work": Hammer,
  Wood: Trees,
  "Wood Craft": Trees,
  "Home Decor": Home,
  Gifts: Gift,
  Gift: Gift,
  Kitchen: Utensils,
  Garden: Sprout,
  Jewelry: Gem,
  Textiles: ShoppingBag,
  Ceramic: BadgeCheck,
  "Blown Glass": Gem,
  Glass: Gem,
  "Top offers": Gift,
  Decor: Home,
  Newest: BadgeCheck,
  Trending: BadgeCheck,
};

const DEFAULT_ICON = ShoppingBag;

// Category item type
export interface CategoryItem {
  id: string;
  name: string;
  href?: string;
  count?: number;
  icon?: LucideIcon;
}

interface CategoryChipsProps {
  categories: CategoryItem[];
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  variant?: "default" | "compact" | "large";
  scrollable?: boolean;
  showCounts?: boolean;
  className?: string;
}

// Animation variants with proper TypeScript types
const springTransition: Transition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 24,
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.95,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
};

// Default categories for homepage
export const defaultCategories: CategoryItem[] = [
  { id: "all", name: "All", href: "/products" },
  ...storefrontFeaturedCategories.map((category) => ({
    id: category,
    name: category,
    href: `/products?category=${encodeURIComponent(category)}`,
  })),
];

export default function CategoryChips({
  categories,
  activeCategory = "all",
  onCategoryChange,
  variant = "default",
  scrollable = true,
  showCounts = false,
  className,
}: CategoryChipsProps) {
  const getIcon = (category: CategoryItem) => {
    if (category.icon) return category.icon;
    return categoryIcons[category.name] || categoryIcons[category.id] || DEFAULT_ICON;
  };

  const isActive = (category: CategoryItem) => {
    return activeCategory === category.id || activeCategory === category.name;
  };

  // Size classes based on variant
  const sizeClasses = {
    compact: "px-3 sm:px-4 py-1.5 text-xs sm:text-sm",
    default: "px-4 sm:px-5 py-2.5 text-sm sm:text-base",
    large: "px-5 sm:px-6 py-3 text-base sm:text-lg",
  };

  // Container classes
  const containerClasses = cn(
    "flex gap-2.5",
    scrollable && "overflow-x-auto whitespace-nowrap pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0",
    className
  );

  return (
    <motion.div
      className={containerClasses}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      role="tablist"
      aria-label="Category navigation"
    >
      {categories.map((category) => {
        const active = isActive(category);
        const IconComponent = getIcon(category);

        const chipContent = (
          <>
            {/* Active background highlight with layout animation */}
            {active && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400"
                transition={{
                  type: "spring" as const,
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}

            {/* Content */}
            <span
              className={cn(
                "relative z-10 inline-flex items-center gap-1.5 sm:gap-2",
                active ? "text-slate-900" : "text-slate-200"
              )}
            >
              <IconComponent
                className={cn(
                  "shrink-0 transition-transform duration-300",
                  active ? "text-slate-900" : "text-slate-300",
                  variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"
                )}
              />
              <span className="font-medium whitespace-nowrap">{category.name}</span>
              {showCounts && category.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-slate-900/20 text-slate-900"
                      : "bg-white/10 text-slate-400"
                  )}
                >
                  {category.count}
                </span>
              )}
            </span>
          </>
        );

        // If href is provided, render as Link-compatible button
        if (category.href && onCategoryChange) {
          return (
            <motion.button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-pressed={active}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                // Base classes
                "relative inline-flex items-center justify-center shrink-0",
                "rounded-full border backdrop-blur-md",
                "transition-all duration-300 ease-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                scrollable && "snap-start",
                // Default state - glass effect
                active
                  ? "border-amber-200/70 text-slate-900 shadow-[0_0_25px_rgba(251,191,36,0.35)]"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-amber-300/30 hover:text-white",
                sizeClasses[variant]
              )}
            >
              {chipContent}
            </motion.button>
          );
        }

        // Default button
        return (
          <motion.button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onCategoryChange?.(category.id)}
            className={cn(
              // Base classes
              "relative inline-flex items-center justify-center shrink-0",
              "rounded-full border backdrop-blur-md",
              "transition-all duration-300 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
              scrollable && "snap-start",
              // Default state - glass effect
              active
                ? "border-amber-200/70 text-slate-900 shadow-[0_0_25px_rgba(251,191,36,0.35)]"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-amber-300/30 hover:text-white",
              sizeClasses[variant]
            )}
          >
            {chipContent}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// Light theme variant for use on light backgrounds
export function CategoryChipsLight({
  categories,
  activeCategory = "all",
  onCategoryChange,
  variant = "default",
  scrollable = true,
  showCounts = false,
  className,
}: CategoryChipsProps) {
  const getIcon = (category: CategoryItem) => {
    if (category.icon) return category.icon;
    return categoryIcons[category.name] || categoryIcons[category.id] || DEFAULT_ICON;
  };

  const isActive = (category: CategoryItem) => {
    return activeCategory === category.id || activeCategory === category.name;
  };

  const sizeClasses = {
    compact: "px-3 sm:px-4 py-1.5 text-xs sm:text-sm",
    default: "px-4 sm:px-5 py-2.5 text-sm sm:text-base",
    large: "px-5 sm:px-6 py-3 text-base sm:text-lg",
  };

  const containerClasses = cn(
    "flex gap-2.5",
    scrollable && "overflow-x-auto whitespace-nowrap pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0",
    className
  );

  return (
    <motion.div
      className={containerClasses}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      role="tablist"
      aria-label="Category navigation"
    >
      {categories.map((category) => {
        const active = isActive(category);
        const IconComponent = getIcon(category);

        return (
          <motion.button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onCategoryChange?.(category.id)}
            className={cn(
              // Base classes
              "relative inline-flex items-center justify-center shrink-0",
              "rounded-full border backdrop-blur-md",
              "transition-all duration-300 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
              scrollable && "snap-start",
              // Default state - light theme glass
              active
                ? "border-amber-400/60 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                : "border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-amber-300/50 hover:text-amber-700 shadow-sm",
              sizeClasses[variant]
            )}
          >
            {/* Active background */}
            {active && (
              <motion.div
                layoutId="activeCategoryLight"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400"
                transition={{
                  type: "spring" as const,
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}

            {/* Content */}
            <span
              className={cn(
                "relative z-10 inline-flex items-center gap-1.5 sm:gap-2",
                active ? "text-slate-900" : "text-gray-700"
              )}
            >
              <IconComponent
                className={cn(
                  "shrink-0 transition-transform duration-300",
                  active ? "text-slate-900" : "text-gray-500",
                  variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"
                )}
              />
              <span className="font-medium whitespace-nowrap">{category.name}</span>
              {showCounts && category.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-slate-900/15 text-slate-900"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {category.count}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
