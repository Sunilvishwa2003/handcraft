import mongoose from 'mongoose';
import BehaviorEvent from '../models/BehaviorEvent';
import Order from '../models/Order';
import Product, { IProduct } from '../models/Product';
import User from '../models/User';
import Ad, { AD_PLACEMENTS, type AdPlacement } from '../models/Ad';

type LeanProduct = Partial<IProduct> & {
  _id: mongoose.Types.ObjectId | string;
  createdAt?: Date;
};

const stopWords = new Set(['a', 'an', 'and', 'are', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export const tokenize = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token));
};

const productCorpus = (product: LeanProduct) => {
  return [
    product.name,
    product.description,
    product.brand,
    product.category,
    product.subcategory,
    ...(product.specs || []),
    ...(product.tags || []),
    ...(product.semanticKeywords || []),
  ]
    .filter(Boolean)
    .join(' ');
};

const overlapScore = (queryTokens: string[], product: LeanProduct) => {
  const corpusTokens = tokenize(productCorpus(product));
  const corpus = new Set(corpusTokens);
  const directMatches = queryTokens.filter((token) => corpus.has(token)).length;
  const fuzzyMatches = queryTokens.filter((token) => corpusTokens.some((item) => item.includes(token) || token.includes(item))).length;
  const ratingBoost = (product.rating || 0) / 5;
  const popularityBoost = Math.log10((product.purchases || 0) + (product.views || 0) + 10) / 4;

  return directMatches * 2 + fuzzyMatches + ratingBoost + popularityBoost;
};

export const semanticProductSearch = <T extends LeanProduct>(products: T[], query: string) => {
  const queryTokens = tokenize(query);

  if (!queryTokens.length) {
    return products;
  }

  return products
    .map((product) => ({ product, score: overlapScore(queryTokens, product) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
};

export const sortProducts = <T extends LeanProduct>(products: T[], sort?: string) => {
  const sorted = [...products];

  switch (sort) {
    case 'best-seller':
      return sorted.sort((a, b) => (b.bestSellerScore || b.purchases || 0) - (a.bestSellerScore || a.purchases || 0));
    case 'trending':
      return sorted.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    case 'newest':
      return sorted.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    case 'highest-rated':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'price-low':
      return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price-high':
      return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    default:
      return sorted.sort((a, b) => {
        const scoreA = (a.rating || 0) * 2 + (a.trendingScore || 0) + (a.bestSellerScore || 0);
        const scoreB = (b.rating || 0) * 2 + (b.trendingScore || 0) + (b.bestSellerScore || 0);
        return scoreB - scoreA;
      });
  }
};

export const normalizeAdPlacement = (value?: string): AdPlacement => {
  const normalized = String(value || 'home')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  if (AD_PLACEMENTS.includes(normalized as AdPlacement)) {
    return normalized as AdPlacement;
  }

  if (normalized === 'stone-nameboard') {
    return 'stone-name-board';
  }

  return 'home';
};

export const getActiveAdsByPlacement = async (placement = 'home') => {
  const normalizedPlacement = normalizeAdPlacement(placement);
  return Ad.find({ active: true, placements: normalizedPlacement }).sort({ sortOrder: 1, createdAt: -1 }).lean();
};

export const getCustomersAlsoBought = async (productId: string, limit = 8) => {
  const orders = await Order.find({ 'orderItems.product': productId }).select('orderItems.product').lean();
  const counts = new Map<string, number>();

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const id = String(item.product);
      if (id !== productId) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    });
  });

  const ids = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (ids.length) {
    const products = await Product.find({ _id: { $in: ids } }).lean();
    return products.sort((a, b) => ids.indexOf(String(a._id)) - ids.indexOf(String(b._id)));
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    return [];
  }

  return Product.find({ _id: { $ne: productId }, category: product.category }).sort({ rating: -1, purchases: -1 }).limit(limit).lean();
};

export const getRecommendedForUser = async (userId?: string, limit = 10): Promise<any[]> => {
  if (!userId) {
    return Product.find({ countInStock: { $gt: 0 } }).sort({ trendingScore: -1, rating: -1 }).limit(limit).lean();
  }

  const user = await User.findById(userId).populate('recentlyViewed.product wishlist').lean();
  const recentEvents = await BehaviorEvent.find({ user: userId }).sort({ createdAt: -1 }).limit(30).populate('product').lean();
  const categoryWeights = new Map<string, number>();
  const tagWeights = new Map<string, number>();
  const seen = new Set<string>();

  user?.recentlyViewed?.forEach((entry: any) => {
    if (entry.product?._id) {
      seen.add(String(entry.product._id));
      categoryWeights.set(entry.product.category, (categoryWeights.get(entry.product.category) || 0) + 3);
      (entry.product.tags || []).forEach((tag: string) => tagWeights.set(tag, (tagWeights.get(tag) || 0) + 1));
    }
  });

  recentEvents.forEach((event: any) => {
    if (event.product?._id) {
      seen.add(String(event.product._id));
      const eventWeight = event.eventType === 'purchase' ? 5 : event.eventType === 'cart' ? 4 : 2;
      categoryWeights.set(event.product.category, (categoryWeights.get(event.product.category) || 0) + eventWeight);
      (event.product.tags || []).forEach((tag: string) => tagWeights.set(tag, (tagWeights.get(tag) || 0) + eventWeight));
    }
  });

  const products = await Product.find({ countInStock: { $gt: 0 } }).lean();
  const scored = products
    .filter((product) => !seen.has(String(product._id)))
    .map((product) => {
      const categoryScore = categoryWeights.get(product.category) || 0;
      const tagScore = (product.tags || []).reduce((score: number, tag: string) => score + (tagWeights.get(tag) || 0), 0);
      const qualityScore = (product.rating || 0) + Math.log10((product.purchases || 0) + 10);
      return { product, score: categoryScore + tagScore + qualityScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.product);

  return scored.length ? scored : getRecommendedForUser(undefined, limit);
};

export const getPersonalizedHomepage = async (userId?: string) => {
  const [recommended, trending, bestSellers, newest, ads] = await Promise.all([
    getRecommendedForUser(userId, 8),
    Product.find({ countInStock: { $gt: 0 } }).sort({ trendingScore: -1, views: -1 }).limit(8).lean(),
    Product.find({ countInStock: { $gt: 0 } }).sort({ purchases: -1, bestSellerScore: -1 }).limit(8).lean(),
    Product.find({ countInStock: { $gt: 0 } }).sort({ createdAt: -1 }).limit(8).lean(),
    getActiveAdsByPlacement('home'),
  ]);

  return { recommended, trending, bestSellers, newest, ads };
};

export const detectFraud = async (input: { userId: string; totalPrice: number; itemCount: number; paymentMethod?: string }) => {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentOrders = input.userId && input.userId !== "undefined" ? await Order.find({ user: input.userId, createdAt: { $gte: since } }).lean() : [];
  const recentEvents = input.userId && input.userId !== "undefined" ? await BehaviorEvent.find({ user: input.userId, createdAt: { $gte: since } }).lean() : [];
  let score = 0;
  const flags: string[] = [];

  if (input.totalPrice > 100000) {
    score += 35;
    flags.push('high_order_value');
  }
  if (input.itemCount > 10) {
    score += 20;
    flags.push('large_item_count');
  }
  if (recentOrders.length >= 3) {
    score += 25;
    flags.push('many_orders_in_short_window');
  }
  if (recentEvents.filter((event) => event.eventType === 'checkout').length >= 5) {
    score += 15;
    flags.push('repeated_checkout_attempts');
  }
  if (input.paymentMethod?.toLowerCase().includes('cod') && input.totalPrice > 50000) {
    score += 15;
    flags.push('high_value_cod');
  }

  return { score: Math.min(score, 100), flags, decision: score >= 70 ? 'review' : score >= 40 ? 'monitor' : 'allow' };
};

export const calculateDynamicPrice = (product: LeanProduct) => {
  const basePrice = product.price || 0;
  const stock = product.countInStock || 0;
  const demand = (product.demandScore || 1) + (product.trendingScore || 0) / 100 + (product.purchases || 0) / 250;
  const scarcityMultiplier = stock > 0 && stock <= 3 ? 1.08 : stock > 20 ? 0.97 : 1;
  const demandMultiplier = Math.min(1.15, Math.max(0.92, 1 + (demand - 1) * 0.04));
  const suggestedPrice = Math.round(basePrice * scarcityMultiplier * demandMultiplier);

  return {
    currentPrice: basePrice,
    suggestedPrice,
    demandMultiplier,
    scarcityMultiplier,
    reason:
      suggestedPrice > basePrice
        ? 'Demand and scarcity support a higher price.'
        : suggestedPrice < basePrice
          ? 'Inventory depth supports a sharper price.'
          : 'Current price is aligned with demand.',
  };
};

export const synonymMap: Record<string, string[]> = {
  ganesh: ['ganesha', 'vinayagar', 'vinayaka', 'pillayar', 'ganpati', 'ganapati'],
  murugan: ['subramanya', 'karthikeya', 'karthikeyan', 'subramaniam'],
  shiva: ['sivan', 'mahadev', 'shivling', 'lingam', 'shivaling'],
  buddha: ['buddha-statue', 'buddha-idol', 'buddhist', 'buddhist-statue'],
  name: ['name-board', 'nameboard', 'stone-name-board', 'personalized-nameboard'],
  garden: ['garden-sculpture', 'garden-statue', 'garden-fountain', 'stone-fountain'],
  home: ['home-decor', 'decor', 'home-decor'],
};

export const buildIntentKeywords = (text: string) => {
  const tokens = tokenize(text);
  const keywords = new Set<string>(tokens);
  tokens.forEach((t) => {
    const syn = synonymMap[t];
    if (Array.isArray(syn)) {
      syn.forEach((s) => keywords.add(s));
    }
  });
  return Array.from(keywords);
};

export const searchProductsByIntent = async (userMessage: string, limit = 5) => {
  const keywords = buildIntentKeywords(userMessage || '');
  if (!keywords.length) {
    return [];
  }

  // Build regex options for MongoDB queries
  const regexes = keywords.map((k) => new RegExp(k.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&'), 'i'));

  const query = {
    $or: [
      { name: { $in: regexes } },
      { slug: { $in: regexes } },
      { category: { $in: regexes } },
      { subcategory: { $in: regexes } },
      { tags: { $in: regexes } },
      { keywords: { $in: regexes } },
      { description: { $in: regexes } },
      { semanticKeywords: { $in: regexes } },
    ],
    countInStock: { $gt: 0 },
  } as any;

  // Use MongoDB to find matches with basic relevance sorting
  const products = await Product.find(query)
    .sort({ trendingScore: -1, rating: -1, purchases: -1 })
    .limit(limit)
    .lean();

  // If no results, fallback to text search
  if (!products.length) {
    const fallback = await Product.find({ $text: { $search: userMessage } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
    return fallback;
  }

  return products;
};
