import { Product } from "@/lib/types";

export const storefrontFeaturedCategories = ["Stone", "Stone Name Board", "Home Decor"] as const;

const hiddenStorefrontCategorySlugs = new Set(["metal", "wood"]);

const storefrontCategoryNames: Record<string, string> = {
  stone: "Stone",
  "stone-name-board": "Stone Name Board",
  "home-decor": "Home Decor",
};

function toCategorySlug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function getProductCategoryName(category: Product["category"]): string {
  return typeof category === "string" ? category : category?.name || "";
}

export function getProductCategorySlug(category: Product["category"]): string {
  if (typeof category !== "string" && category?.slug?.trim()) {
    return toCategorySlug(category.slug);
  }

  return toCategorySlug(getProductCategoryName(category));
}

export function getCategoryDisplayName(category: string): string {
  const slug = toCategorySlug(category);
  return storefrontCategoryNames[slug] ?? category;
}

export function isProductFullyCustomizable(product: Product): boolean {
  if (product.isCustomizable === true) {
    return true;
  }

  return getProductCategorySlug(product.category) === "stone-name-board";
}

export function canCustomizeProduct(product: Product): boolean {
  const categorySlug = getProductCategorySlug(product.category);
  return isProductFullyCustomizable(product) || categorySlug === "stone";
}

export function isStorefrontCategoryVisible(category: string): boolean {
  return !hiddenStorefrontCategorySlugs.has(toCategorySlug(category));
}
