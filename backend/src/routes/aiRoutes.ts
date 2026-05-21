import express from 'express';
import mongoose from 'mongoose';
import BehaviorEvent from '../models/BehaviorEvent';
import Order from '../models/Order';
import Product from '../models/Product';
import { admin, protect } from '../middleware/authMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';
import {
  calculateDynamicPrice,
  detectFraud,
  getActiveAdsByPlacement,
  getCustomersAlsoBought,
  getPersonalizedHomepage,
  normalizeAdPlacement,
  getRecommendedForUser,
  semanticProductSearch,
  searchProductsByIntent,
} from '../services/mlService';
import { getProductPrimaryImage } from '../utils/productImage';

const router = express.Router();

router.get(
  '/homepage',
  asyncHandler(async (req, res) => {
    res.json(await getPersonalizedHomepage(req.query.userId ? String(req.query.userId) : undefined));
  })
);

router.get(
  '/slider-ads',
  asyncHandler(async (req, res) => {
    const placement = normalizeAdPlacement(req.query.placement ? String(req.query.placement) : 'home');
    const ads = await getActiveAdsByPlacement(placement);
    res.json({ placement, ads });
  })
);

router.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const productId = req.query.productId ? String(req.query.productId) : undefined;

    const [recommendedForYou, customersAlsoBought] = await Promise.all([
      getRecommendedForUser(userId, 10),
      productId ? getCustomersAlsoBought(productId, 10) : Promise.resolve([]),
    ]);

    res.json({ recommendedForYou, customersAlsoBought });
  })
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || '');
    const products = await Product.find({}).lean();
    const results = semanticProductSearch(products, query).slice(0, 20);
    const eventUserId = req.query.userId && typeof req.query.userId === 'string' ? req.query.userId : undefined;
    await BehaviorEvent.create({ user: eventUserId, eventType: 'search', query, metadata: { source: 'ai' } });
    res.json({ query, results });
  })
);

const formatAiResponse = async (message: string) => {
  const dbResults = await searchProductsByIntent(message, 5);
  const products = (dbResults && dbResults.length) ? dbResults : semanticProductSearch(await Product.find({ countInStock: { $gt: 0 } }).lean(), message).slice(0, 5);

  const responseProducts = products.map((p: any) => ({
    name: p.name,
    image: getProductPrimaryImage(p),
    price: p.price,
    shortDescription: (p.description || '').slice(0, 160),
    url: `/products/${p._id}`,
  }));

  const answer = responseProducts.length
    ? `I found ${responseProducts.length} product(s) that match your request.`
    : 'I could not find an exact match, but try a category, material, color, or use case.';

  await BehaviorEvent.create({ eventType: 'ai-chat', query: message, metadata: { found: responseProducts.length } }).catch(() => undefined);

  return { answer, products: responseProducts };
};

router.post(
  '/recommend',
  asyncHandler(async (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) {
      res.json({ answer: 'Ask me about products, coupons, delivery, or an order ID.', products: [] });
      return;
    }

    const response = await formatAiResponse(message);
    res.json(response);
  })
);

router.post(
  '/chatbot',
  asyncHandler(async (req, res) => {
    const message = String(req.body.message || '').trim();
    const userId = req.body.userId;
    const lower = message.toLowerCase();

    if (!message) {
      res.json({ answer: 'Ask me about products, coupons, delivery, or an order ID.', products: [] });
      return;
    }

    const objectId = message.match(/[a-f0-9]{24}/i)?.[0];
    if ((lower.includes('order') || lower.includes('track')) && objectId && mongoose.isValidObjectId(objectId)) {
      const order = await Order.findOne({ _id: objectId, ...(userId ? { user: userId } : {}) });
      if (order) {
        const lastEvent = order.trackingEvents[order.trackingEvents.length - 1];
        res.json({
          answer: `Order ${order._id} is ${order.status}. Last update: ${lastEvent?.message || 'Order placed'}.`,
          order,
        });
        return;
      }
    }

    if (lower.includes('coupon') || lower.includes('discount') || lower.includes('offer')) {
      res.json({
        answer: 'Try active coupon codes from the offers area. I can also apply a code at checkout and show the final order summary before you place the order.',
        products: [],
      });
      return;
    }

    const response = await formatAiResponse(message);
    res.json(response);
  })
);

router.post(
  '/fraud-check',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const result = await detectFraud({
      userId: String(user?._id),
      totalPrice: Number(req.body.totalPrice || 0),
      itemCount: Number(req.body.itemCount || 0),
      paymentMethod: req.body.paymentMethod,
    });
    res.json(result);
  })
);

router.get(
  '/dynamic-pricing/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json(calculateDynamicPrice(product));
  })
);

export default router;
