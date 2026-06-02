import { getProductCategorySlug, isStorefrontCategoryVisible } from "@/lib/catalog";
import { Product } from "@/lib/types";

const siteUrl = process.env.NEXT_PUBLIC_URL || "https://mahabscrafto.com";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.mahabscrafto.com";

const staticUrls = ["", "/products", "/faq", "/refund-policy", "/custom-order"];
const visibleCategorySlugs = new Set(["stone", "stone-name-board", "home-decor", "wood", "metal", "ceramic", "gifts"]);

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${apiUrl}/products?limit=60&page=1`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const firstPage = await response.json();
  const products: Product[] = firstPage.products ?? [];
  const pages: number = firstPage.pages ?? 1;

  if (pages <= 1) {
    return products;
  }

  const pagePromises = [];
  for (let page = 2; page <= pages; page += 1) {
    pagePromises.push(
      fetch(`${apiUrl}/products?limit=60&page=${page}`, {
        next: { revalidate: 3600 },
      }).then(async (res) => {
        if (!res.ok) {
          return [];
        }
        const pageData = await res.json();
        return pageData.products ?? [];
      })
    );
  }

  const pagesResults = await Promise.all(pagePromises);
  return products.concat(...pagesResults);
}

async function fetchCategorySlugs(): Promise<string[]> {
  const response = await fetch(`${apiUrl}/products/facets`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const facets = await response.json();
  const categories: string[] = facets.categories ?? [];

  return Array.from(
    new Set(
      categories
        .map(getProductCategorySlug)
        .filter((slug): slug is string => Boolean(slug) && isStorefrontCategoryVisible(slug) && visibleCategorySlugs.has(slug))
    )
  );
}

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const [products, categorySlugs] = await Promise.all([fetchProducts(), fetchCategorySlugs()]);

  const sitemapEntries = staticUrls.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date().toISOString(),
  }));

  const categoryEntries = categorySlugs.map((slug) => ({
    url: `${siteUrl}/products?category=${encodeURIComponent(slug)}`,
    lastModified: new Date().toISOString(),
  }));

  const productEntries = products.map((product) => ({
    url: `${siteUrl}/products/${product._id}`,
    lastModified: product.createdAt ?? new Date().toISOString(),
  }));

  return [...sitemapEntries, ...categoryEntries, ...productEntries];
}
