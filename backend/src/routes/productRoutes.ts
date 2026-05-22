import express from 'express';
import BehaviorEvent from '../models/BehaviorEvent';
import Order from '../models/Order';
import Product from '../models/Product';
import Review from '../models/Review';
import User from '../models/User';
import { admin, protect } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';
import { calculateCustomizationPrice, defaultCustomizationOptions, type CustomizationSelection } from '../utils/customization';
import { getCategoryDisplayName, normalizeCategorySlug } from '../utils/category';
import { isCloudinaryImageUpload, uploadFilesToCloudinary, type LocalUploadFile } from '../utils/cloudinaryUploads';
import { getProductPrimaryImage } from '../utils/productImage';
import { getCustomersAlsoBought, sortProducts } from '../services/mlService';

const router = express.Router();

const parseNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getProductCustomizationOptions = (product: any) => product.customizationOptions || defaultCustomizationOptions;

const normalizeStringArray = (value: unknown, separator = ',') => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Fall back to the configured separator parsing below.
      }
    }

    return trimmed
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeImages = (value: unknown) => {
  const normalized = normalizeStringArray(value, '\n');
  if (normalized.length) {
    return normalized;
  }

  return normalizeStringArray(value);
};

const normalizeCustomizationOptions = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  return value;
};

const synonymMap: Record<string, string[]> = {
  ganesh: ['ganesha', 'vinayagar', 'vinayaka', 'pillayar'],
  murugan: ['subramanya', 'karthikeya'],
  shiva: ['sivan', 'mahadev'],
};

const tokenizeSearchTerms = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const buildSearchRegexes = (query: string) => {
  const tokens = tokenizeSearchTerms(query);
  const keywords = new Set<string>(tokens);

  tokens.forEach((token) => {
    const synonyms = synonymMap[token];
    if (Array.isArray(synonyms)) {
      synonyms.forEach((synonym) => keywords.add(synonym));
    }
  });

  return Array.from(keywords).map((keyword) => new RegExp(keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
};

const getUploadedImageUrls = async (req: express.Request, context: string) => {
  const files = (((req as any).files || []) as LocalUploadFile[]).filter(isCloudinaryImageUpload);
  if (!files.length) {
    return [];
  }

  try {
    const { uploaded, failed } = await uploadFilesToCloudinary(files, {
      folder: 'products',
      context,
    });

    if (failed.length) {
      console.error(`[product:create] Cloudinary failed to upload ${failed.length} image(s). Proceeding with successful uploads.`, failed.map((f) => f.originalName));
    }

    return uploaded.map((file) => file.url);
  } catch (err) {
    console.error('[product:create] Unexpected error during Cloudinary uploads:', err instanceof Error ? err.stack || err.message : err);
    // Don't fail product creation solely because Cloudinary had an issue.
    return [];
  }
};

const normalizeProductPayload = (input: Record<string, unknown>, uploadedImageUrls: string[] = []) => {
  const payload: Record<string, unknown> = { ...input };
  const countInStock = input.countInStock !== undefined ? parseNumber(input.countInStock) : undefined;

  if (input.name !== undefined) {
    payload.name = String(input.name || '').trim();
  }

  if (input.brand !== undefined) {
    payload.brand = String(input.brand || '').trim();
  }

  if (input.category !== undefined) {
    payload.category = normalizeCategorySlug(input.category || 'home-decor');
  }

  if (input.subcategory !== undefined) {
    payload.subcategory = input.subcategory ? String(input.subcategory).trim() : undefined;
  }

  if (input.description !== undefined) {
    payload.description = String(input.description || '').trim();
  }

  if (input.price !== undefined) {
    payload.price = parseNumber(input.price);
  }

  if (input.originalPrice !== undefined) {
    const normalized = String(input.originalPrice || '').trim();
    payload.originalPrice = normalized ? parseNumber(input.originalPrice) : undefined;
  }

  if (input.discountPercentage !== undefined) {
    payload.discountPercentage = parseNumber(input.discountPercentage);
  }

  if (countInStock !== undefined) {
    payload.countInStock = countInStock;
  }

  if (input.stockAlertThreshold !== undefined) {
    payload.stockAlertThreshold = parseNumber(input.stockAlertThreshold, 5);
  }

  if (input.availability !== undefined || countInStock !== undefined) {
    payload.availability = input.availability || (countInStock && countInStock > 0 ? 'in-stock' : 'out-of-stock');
  }

  if (input.featured !== undefined) {
    payload.featured = parseBoolean(input.featured);
  }

  if (input.model3dUrl !== undefined) {
    payload.model3dUrl = input.model3dUrl ? String(input.model3dUrl).trim() : undefined;
  }

  if (uploadedImageUrls.length) {
    payload.images = uploadedImageUrls;
  } else if (input.images !== undefined) {
    payload.images = normalizeImages(input.images);
  }

  // Ensure images are stored as an array of objects { url, alt }
  if (payload.images !== undefined) {
    try {
      const imgs = Array.isArray(payload.images) ? payload.images : [payload.images];
      payload.images = imgs.map((it) => {
        if (!it) return { url: '', alt: '' };
        if (typeof it === 'string') return { url: String(it).trim(), alt: '' };
        if (typeof it === 'object') {
          return { url: String((it as any).url || ''), alt: String((it as any).alt || '') };
        }
        return { url: String(it), alt: '' };
      });
    } catch (e) {
      // fallback - ensure at least an empty array
      payload.images = [];
    }
  }

  if (input.specs !== undefined) {
    payload.specs = normalizeStringArray(input.specs, '\n');
  }

  if (input.tags !== undefined) {
    payload.tags = normalizeStringArray(input.tags);
  }

  if (input.keywords !== undefined) {
    payload.keywords = normalizeStringArray(input.keywords);
  }

  if (input.shortDescription !== undefined) {
    payload.shortDescription = String(input.shortDescription || '').trim();
  }

  if (input.status !== undefined) {
    const status = String(input.status || '').trim().toLowerCase();
    payload.status = ['active', 'inactive', 'draft'].includes(status) ? status : 'draft';
  }

  if (input.semanticKeywords !== undefined) {
    payload.semanticKeywords = normalizeStringArray(input.semanticKeywords);
  }

  if (input.vendorName !== undefined) {
    payload.vendorName = String(input.vendorName || '').trim();
  }

  if (input.vendorVerified !== undefined) {
    payload.vendorVerified = parseBoolean(input.vendorVerified);
  }

  if (input.customizationOptions !== undefined) {
    payload.customizationOptions = normalizeCustomizationOptions(input.customizationOptions);
  }

  if (input.isCustomPricing !== undefined) {
    payload.isCustomPricing = parseBoolean(input.isCustomPricing);
  }

  if (input.pricingNoticeMessage !== undefined) {
    const msg = String(input.pricingNoticeMessage || '').trim();
    payload.pricingNoticeMessage = msg || undefined;
  }

  if (input.useApproxPrice !== undefined) {
    const useApproxPrice = parseBoolean(input.useApproxPrice);
    const approxPriceMin = parseNumber(input.approxPriceMin, 0);
    const approxPriceMax = parseNumber(input.approxPriceMax, 0);

    payload.useApproxPrice = useApproxPrice;
    payload.approxPriceMin = useApproxPrice ? approxPriceMin : undefined;
    payload.approxPriceMax = useApproxPrice ? approxPriceMax : undefined;

    // When approx pricing is enabled, ensure price is set to 0
    if (useApproxPrice) {
      payload.price = 0;
    }
  }

  return payload;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const category = req.query.category;
    const brand = req.query.brand;
    const availability = req.query.availability;
    const sort = req.query.sort;
    const page = Math.max(parseNumber(req.query.page, 1), 1);
    const pageParamProvided = req.query.page !== undefined;
    const limitParamProvided = req.query.limit !== undefined;
    const filter: Record<string, unknown> = {};

    if (category && category !== 'all') {
      const categoryValue = String(category || '').trim();
      const normalizedCategorySlug = normalizeCategorySlug(categoryValue);
      const normalizedCategoryName = getCategoryDisplayName(normalizedCategorySlug);

      filter.$or = [
        { category: { $regex: new RegExp(`^${escapeRegExp(normalizedCategorySlug)}$`, 'i') } },
        { category: { $regex: new RegExp(`^${escapeRegExp(normalizedCategoryName)}$`, 'i') } },
        { category: { $regex: new RegExp(`^${escapeRegExp(categoryValue)}$`, 'i') } },
      ];
    }
    if (brand && brand !== 'all') {
      const normalizedBrand = String(brand).trim();
      filter.brand = { $regex: new RegExp(`^${escapeRegExp(normalizedBrand)}$`, 'i') };
    }
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {
        ...(req.query.minPrice ? { $gte: parseNumber(req.query.minPrice) } : {}),
        ...(req.query.maxPrice ? { $lte: parseNumber(req.query.maxPrice) } : {}),
      };
    }
    if (req.query.rating) {
      filter.rating = { $gte: parseNumber(req.query.rating) };
    }
    if (availability === 'in-stock') {
      filter.countInStock = { $gt: 0 };
    }
    if (availability === 'out-of-stock') {
      filter.countInStock = 0;
    }
    if (availability === 'preorder') {
      filter.availability = 'preorder';
    }

    let products = await Product.find(filter).lean();
    if (q) {
      const regexes = buildSearchRegexes(q);
      const searchConditions = [
        { name: { $in: regexes } },
        { category: { $in: regexes } },
        { subcategory: { $in: regexes } },
        { brand: { $in: regexes } },
        { tags: { $in: regexes } },
        { description: { $in: regexes } },
        { semanticKeywords: { $in: regexes } },
      ];

      const query: any = { $and: [{ $or: searchConditions }] };
      if (Object.keys(filter).length) {
        query.$and.push(filter);
      }

      products = await Product.find(query).sort({ trendingScore: -1, rating: -1, purchases: -1 }).lean();

      if (!products.length) {
        const fallbackQuery: any = { $text: { $search: q } };
        if (Object.keys(filter).length) {
          fallbackQuery.$and = [filter, { $text: { $search: q } }];
        }

        products = await Product.find(fallbackQuery)
          .sort({ score: { $meta: 'textScore' }, trendingScore: -1, rating: -1 })
          .lean();
      }

      await BehaviorEvent.create({ eventType: 'search', query: String(q), metadata: { source: 'catalog' } });
    } else {
      products = sortProducts(products, String(sort || 'relevance'));
    }

    const total = products.length;

    // If client did not provide pagination params and a category filter is active,
    // return all matching products for category pages (shows full category listing).
    if (!pageParamProvided && !limitParamProvided && category && category !== 'all') {
      return res.json({
        products,
        page: 1,
        pages: 1,
        total,
        sort: sort || (q ? 'semantic' : 'relevance'),
      });
    }

    const limit = Math.min(Math.max(parseNumber(req.query.limit, 12), 1), 60);
    const start = (page - 1) * limit;

    res.json({
      products: products.slice(start, start + limit),
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
      sort: sort || (q ? 'semantic' : 'relevance'),
    });
  })
);

router.get(
  '/facets',
  asyncHandler(async (_req, res) => {
    const [categories, brands, priceRange] = await Promise.all([
      Product.distinct('category'),
      Product.distinct('brand'),
      Product.aggregate([{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]),
    ]);

    res.json({
      categories,
      brands,
      priceRange: priceRange[0] || { min: 0, max: 0 },
    });
  })
);

router.get(
  '/menu',
  asyncHandler(async (_req, res) => {
    const categories = await Product.distinct('category');
    res.json({
      success: true,
      data: categories,
    });
  })
);

router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json({ suggestions: [] });
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let products = await Product.find({
      $or: [
        { name: regex },
        { brand: regex },
        { category: regex },
        { subcategory: regex },
        { tags: regex },
        { description: regex },
      ],
    })
      .sort({ trendingScore: -1, bestSellerScore: -1 })
      .limit(12)
      .lean();

    if (!products.length) {
      products = await Product.find({
        $text: { $search: query },
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(12)
        .lean();
    }

    res.json({
      suggestions: products.map((product) => ({
        _id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        vendorName: product.vendorName,
      })),
    });
  })
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 60);

    if (!q) {
      return res.json({ success: true, count: 0, products: [] });
    }

    const regexes = buildSearchRegexes(q);

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
    } as any;

    let products = await Product.find(query).sort({ trendingScore: -1, rating: -1 }).lean();

    if (!products.length) {
      products = await Product.find({ $text: { $search: q } })
        .sort({ score: { $meta: 'textScore' } })
        .lean();
    }

    const total = products.length;
    const start = (page - 1) * limit;
    const sliced = products.slice(start, start + limit);

    res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit) || 1,
      products: sliced.map((p) => ({
        name: p.name,
        image: getProductPrimaryImage(p),
        price: p.price,
        useApproxPrice: p.useApproxPrice,
        approxPriceMin: p.approxPriceMin,
        approxPriceMax: p.approxPriceMax,
        shortDescription: (p.description || '').slice(0, 200),
        url: `/products/${p._id}`,
      })),

    });
  })
);

router.get(
  '/:id/related',
  asyncHandler(async (req, res) => {
    res.json(await getCustomersAlsoBought(String(req.params.id)));
  })
);

router.post(
  '/:id/customization-quote',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const selection = (req.body || {}) as CustomizationSelection;
    const pricing = calculateCustomizationPrice(product.price, selection);

    res.json({
      productId: String(product._id),
      currency: 'INR',
      customizationOptions: getProductCustomizationOptions(product),
      ...pricing,
    });
  })
);

router.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ product: req.params.id }).sort({ createdAt: -1 });
    res.json(reviews);
  })
);

router.post(
  '/:id/reviews',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const alreadyReviewed = await Review.findOne({ user: user?._id, product: product._id });
    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed by this user');
    }

    const purchase = await Order.findOne({ user: user?._id, 'orderItems.product': product._id, isPaid: true });
    const review = await Review.create({
      user: user?._id,
      product: product._id,
      name: user?.name || 'Customer',
      rating: Number(req.body.rating),
      comment: req.body.comment,
      verifiedPurchase: Boolean(purchase),
    });

    const stats = await Review.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: '$product', rating: { $avg: '$rating' }, numReviews: { $sum: 1 } } },
    ]);

    product.rating = Number((stats[0]?.rating || 0).toFixed(1));
    product.numReviews = stats[0]?.numReviews || 0;
    await product.save();

    res.status(201).json(review);
  })
);

router.post(
  '/:id/view',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1, trendingScore: 0.25 } }, { returnDocument: 'after' });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const dbUser = await User.findById(user?._id);
    if (dbUser) {
      dbUser.recentlyViewed = dbUser.recentlyViewed.filter((entry: any) => String(entry.product) !== String(product._id)) as any;
      dbUser.recentlyViewed.unshift({ product: product._id, viewedAt: new Date() } as any);
      dbUser.recentlyViewed = dbUser.recentlyViewed.slice(0, 12) as any;
      await dbUser.save();
    }

    await BehaviorEvent.create({ user: user?._id, product: product._id, eventType: 'view', metadata: {} });
    res.json({ message: 'View recorded' });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1, trendingScore: 0.1 } }, { returnDocument: 'after' }).lean();
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json({
      ...product,
      customizationOptions: getProductCustomizationOptions(product),
    });
  })
);

router.post(
  '/',
  protect,
  admin,
  upload.array('assets', 10),
  asyncHandler(async (req, res) => {
    try {
      // When multipart images are present, their Cloudinary secure URLs replace any stale /uploads local paths.
      // This preserves the existing create-product response format while ensuring persistent CDN storage.
      console.log('[product:create] incoming request headers:', Object.keys(req.headers));
      console.log('[product:create] body keys:', Object.keys(req.body || {}));

      const uploadedImageUrls = await getUploadedImageUrls(req, `product-create:${String(req.body.name || 'unknown-product')}`);
      const payload = normalizeProductPayload(req.body, uploadedImageUrls);
      const product = await Product.create(payload);
      res.status(201).json(product);
    } catch (err) {
      console.error('PRODUCT CREATE ERROR:', err instanceof Error ? err.stack || err.message : err);
      console.error('[product:create] request body snapshot:', JSON.stringify(req.body || {}).slice(0, 2000));

      if (err && typeof err === 'object' && (err as any).name === 'ValidationError') {
        res.status(400).json({ success: false, message: (err as any).message });
        return;
      }

      throw err;
    }
  })
);

router.put(
  '/:id',
  protect,
  admin,
  upload.array('assets', 10),
  asyncHandler(async (req, res) => {
    try {
      // Product updates intentionally replace older image arrays when new files are uploaded.
      const uploadedImageUrls = await getUploadedImageUrls(req, `product-update:${String(req.params.id)}`);
      const payload = normalizeProductPayload(req.body, uploadedImageUrls);
      const product = await Product.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after', runValidators: true });
      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }
      res.json(product);
    } catch (err) {
      console.error('PRODUCT UPDATE ERROR:', err instanceof Error ? err.stack || err.message : err);
      if (err && typeof err === 'object' && (err as any).name === 'ValidationError') {
        res.status(400).json({ success: false, message: (err as any).message });
        return;
      }
      throw err;
    }
  })
);

router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json({ message: 'Product deleted' });
  })
);

export default router;
