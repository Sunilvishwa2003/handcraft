export const storefrontCategories = [
  { name: 'Stone', slug: 'stone' },
  { name: 'Stone Name Board', slug: 'stone-name-board' },
  { name: 'Metal', slug: 'metal' },
  { name: 'Wood', slug: 'wood' },
  { name: 'Home Decor', slug: 'home-decor' },
  { name: 'Statues', slug: 'statues' },
  { name: 'Pooja Items', slug: 'pooja-items' },
  { name: 'Garden Decor', slug: 'garden-decor' },
];

const categorySlugByName = new Map<string, string>(
  storefrontCategories.map((category) => [category.name.toLowerCase(), category.slug]),
);
const categoryNameBySlug = new Map<string, string>(
  storefrontCategories.map((category) => [category.slug, category.name]),
);

export function normalizeCategorySlug(value: unknown, fallback = 'home-decor'): string {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (categorySlugByName.has(lower)) {
    return categorySlugByName.get(lower)!;
  }

  if (categoryNameBySlug.has(lower)) {
    return lower;
  }

  return lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function getCategoryDisplayName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const slug = normalizeCategorySlug(value);
  return categoryNameBySlug.get(slug) ?? String(value).trim();
}

export function normalizeCategories(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeCategorySlug(value))));
}
