import express from 'express';
import mongoose from 'mongoose';
import Coupon from '../models/Coupon';
import Order from '../models/Order';
import Product, { type IProduct } from '../models/Product';
import User from '../models/User';
import Ad, { AD_PLACEMENTS, type AdPlacement } from '../models/Ad';
import { admin, protect } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { normalizeCategorySlug } from '../utils/category';
import { uploadFilesToCloudinary, type LocalUploadFile } from '../utils/cloudinaryUploads';

const router = express.Router();

const normalizeStringArray = (value: unknown, separator = ',') => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeAdPlacements = (value: unknown): AdPlacement[] => {
  const normalized = normalizeStringArray(value).map((item) => item.trim().toLowerCase());
  const placements = normalized.filter((item): item is AdPlacement => AD_PLACEMENTS.includes(item as AdPlacement));

  return placements.length ? [...new Set<AdPlacement>(placements)] : ['home'];
};

const normalizeAvailability = (value: unknown, countInStock: number): IProduct['availability'] => {
  if (value === 'in-stock' || value === 'out-of-stock' || value === 'preorder') {
    return value;
  }

  return countInStock > 0 ? 'in-stock' : 'out-of-stock';
};

const normalizeProductPayload = (input: Record<string, unknown>) => {
  const price = Number(input.price || 0);
  const originalPrice = Number(input.originalPrice || 0);
  const countInStock = Number(input.countInStock || 0);
  const stockAlertThreshold = Number(input.stockAlertThreshold || 5);
  const images = Array.isArray(input.images)
    ? input.images.map((item) => String(item).trim()).filter(Boolean)
    : normalizeStringArray(input.images, '\n');

  return {
    name: String(input.name || '').trim(),
    brand: String(input.brand || 'Handcrafts').trim(),
    category: normalizeCategorySlug(input.category || 'home-decor'),
    subcategory: input.subcategory ? String(input.subcategory).trim() : undefined,
    description: String(input.description || '').trim(),
    price,
    originalPrice: originalPrice > 0 ? originalPrice : undefined,
    discountPercentage: originalPrice > price && originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : Number(input.discountPercentage || 0),
    countInStock,
    stockAlertThreshold,
    availability: normalizeAvailability(input.availability, countInStock),
    featured: Boolean(input.featured),
    model3dUrl: input.model3dUrl ? String(input.model3dUrl).trim() : undefined,
    images,
    specs: normalizeStringArray(input.specs, '\n'),
    tags: normalizeStringArray(input.tags),
    semanticKeywords: normalizeStringArray(input.semanticKeywords),
    vendorName: String(input.vendorName || 'Handcrafts').trim(),
    vendorVerified: Boolean(input.vendorVerified),
    keywords: normalizeStringArray(input.keywords),
    shortDescription: input.shortDescription ? String(input.shortDescription).trim() : undefined,
    status: ['active', 'inactive', 'draft'].includes(String(input.status || '').trim().toLowerCase())
      ? (String(input.status).trim().toLowerCase() as 'active' | 'inactive' | 'draft')
      : 'draft',
  };
};

router.use(protect, admin);

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [orders, users, products, revenueAgg, lowStock, recentOrders] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([{ $match: { isPaid: true } }, { $group: { _id: null, revenue: { $sum: '$totalPrice' } } }]),
      Product.find({ $expr: { $lte: ['$countInStock', '$stockAlertThreshold'] } }).limit(10),
      Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name email'),
    ]);

    res.json({
      metrics: {
        orders,
        users,
        products,
        revenue: revenueAgg[0]?.revenue || 0,
      },
      lowStock,
      recentOrders,
    });
  })
);

router.get(
  '/analytics',
  asyncHandler(async (_req, res) => {
    const [salesByDay, topProducts, statusBreakdown] = await Promise.all([
      Order.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      Product.find().sort({ purchases: -1, revenue: -1 }).limit(10),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({ salesByDay, topProducts, statusBreakdown });
  })
);

router.get(
  '/inventory',
  asyncHandler(async (_req, res) => {
    const products = await Product.find().sort({ countInStock: 1 });
    const alerts = products.filter((product) => product.countInStock <= product.stockAlertThreshold);
    res.json({ products, alerts });
  })
);

router.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'name email');
    res.json(orders);
  })
);

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  })
);

router.get(
  '/products/grouped',
  asyncHandler(async (_req, res) => {
    // Group products by category with counts and sample items
    const grouped = await Product.aggregate([
      { $sort: { category: 1, name: 1 } },
      { $group: { _id: '$category', count: { $sum: 1 }, products: { $push: { _id: '$_id', name: '$name', subcategory: '$subcategory', price: '$price', images: '$images', availability: '$availability' } } } },
      { $project: { category: '$_id', count: 1, products: { $slice: ['$products', 200] } } },
      { $sort: { count: -1, category: 1 } },
    ]).allowDiskUse(true);

    res.json({ success: true, groups: grouped });
  })
);

router.get(
  '/ads',
  asyncHandler(async (_req, res) => {
    const ads = await Ad.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(ads);
  })
);

router.post(
  '/ads',
  asyncHandler(async (req, res) => {
    const { title, description, imageUrl, desktopImage, tabletImage, mobileImage, targetUrl, productId, active, sortOrder, placements } = req.body;
    if (!(imageUrl || desktopImage || tabletImage || mobileImage) || !targetUrl) {
      res.status(400);
      throw new Error('At least one ad image and targetUrl are required.');
    }

    const ad = await Ad.create({
      title: title ? String(title).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      imageUrl: imageUrl ? String(imageUrl).trim() : (desktopImage || tabletImage || mobileImage) as string,
      desktopImage: desktopImage ? String(desktopImage).trim() : undefined,
      tabletImage: tabletImage ? String(tabletImage).trim() : undefined,
      mobileImage: mobileImage ? String(mobileImage).trim() : undefined,
      targetUrl: String(targetUrl).trim(),
      product: productId && mongoose.isValidObjectId(String(productId)) ? String(productId) : undefined,
      placements: normalizeAdPlacements(placements),
      active: Boolean(active),
      sortOrder: Number(sortOrder) || 0,
    });

    res.status(201).json(ad);
  })
);

router.put(
  '/ads/:id',
  asyncHandler(async (req, res) => {
    const updated = await Ad.findByIdAndUpdate(
      req.params.id,
        {
        title: req.body.title !== undefined ? String(req.body.title).trim() : undefined,
        description: req.body.description !== undefined ? String(req.body.description).trim() : undefined,
        imageUrl: req.body.imageUrl !== undefined ? (String(req.body.imageUrl).trim() || undefined) : undefined,
        desktopImage: req.body.desktopImage !== undefined ? String(req.body.desktopImage).trim() : undefined,
        tabletImage: req.body.tabletImage !== undefined ? String(req.body.tabletImage).trim() : undefined,
        mobileImage: req.body.mobileImage !== undefined ? String(req.body.mobileImage).trim() : undefined,
        targetUrl: req.body.targetUrl !== undefined ? String(req.body.targetUrl).trim() : undefined,
        product: req.body.productId && mongoose.isValidObjectId(String(req.body.productId)) ? String(req.body.productId) : undefined,
        placements: normalizeAdPlacements(req.body.placements),
        active: Boolean(req.body.active),
        sortOrder: Number(req.body.sortOrder) || 0,
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) {
      res.status(404);
      throw new Error('Ad not found');
    }

    res.json(updated);
  })
);

router.delete(
  '/ads/:id',
  asyncHandler(async (req, res) => {
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ad deleted' });
  })
);

router.post(
  '/upload',
  upload.array('assets', 10),
  asyncHandler(async (req, res) => {
    // Accept multipart file uploads, upload them to Cloudinary, and return permanent secure URLs.
    // Local temp files are removed after each Cloudinary upload attempt.
    const files = (((req as any).files || []) as LocalUploadFile[]);
    if (!files.length) {
      res.status(400);
      throw new Error('At least one image file is required.');
    }

    const { uploaded, failed } = await uploadFilesToCloudinary(files, {
      folder: 'products',
      context: 'admin-upload',
    });

    if (!uploaded.length) {
      res.status(502);
      throw new Error('Cloudinary image upload failed. Check backend logs for details.');
    }

    res.status(201).json({
      files: uploaded.map((file) => ({
        originalName: file.originalName,
        url: file.url,
        mimetype: file.mimetype,
        size: file.size,
      })),
      ...(failed.length ? { message: `${failed.length} image upload(s) failed and were skipped.` } : {}),
    });
  })
);

router.post(
  '/products/import',
  asyncHandler(async (req, res) => {
    const incomingProducts = Array.isArray(req.body.products) ? req.body.products : [];

    if (!incomingProducts.length) {
      res.status(400);
      throw new Error('Provide a products array for bulk import');
    }

    const results: {
      created: number;
      updated: number;
      skipped: number;
      errors: { index: number; name?: string; reason: string }[];
    } = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let index = 0; index < incomingProducts.length; index += 1) {
      const rawItem = incomingProducts[index] as Record<string, unknown>;
      const payload = normalizeProductPayload(rawItem);

      if (!payload.name || !payload.description || !payload.category || !payload.brand || !payload.images.length) {
        results.skipped += 1;
        results.errors.push({
          index,
          name: payload.name || undefined,
          reason: 'Missing required fields: name, brand, category, description, and at least one image are required.',
        });
        continue;
      }

      const lookupConditions: Record<string, unknown>[] = [{ name: payload.name, brand: payload.brand }];
      if (typeof rawItem._id === 'string' && mongoose.isValidObjectId(rawItem._id)) {
        lookupConditions.unshift({ _id: rawItem._id });
      }

      const existing = await Product.findOne({
        $or: lookupConditions,
      });

      if (existing) {
        Object.assign(existing, payload);
        await existing.save();
        results.updated += 1;
      } else {
        await Product.create(payload);
        results.created += 1;
      }
    }

    res.status(201).json({
      message: 'Bulk import completed',
      ...results,
    });
  })
);

router.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    res.json(await Coupon.find().sort({ createdAt: -1 }));
  })
);

router.post(
  '/coupons',
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  })
);

router.put(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    res.json(coupon);
  })
);

router.delete(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  })
);

export default router;
