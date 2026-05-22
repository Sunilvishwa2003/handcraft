import express from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import BehaviorEvent from '../models/BehaviorEvent';
import { protect } from '../middleware/authMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';
import { calculateOrderTotals } from '../utils/pricing';
import { getProductPrimaryImage } from '../utils/productImage';

const router = express.Router();

const getCartItemPrice = (product: any) => {
  if (product.useApproxPrice && typeof product.approxPriceMin === 'number' && typeof product.approxPriceMax === 'number' && product.approxPriceMax >= product.approxPriceMin) {
    return Math.round((product.approxPriceMin + product.approxPriceMax) / 2);
  }
  return product.price;
};

const recalculateCart = async (cart: any) => {
  cart.subtotal = cart.items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0);
  const itemCount = cart.items.reduce((sum: number, item: any) => sum + item.qty, 0);
  const totals = await calculateOrderTotals(cart.subtotal, cart.couponCode, 'standard', itemCount);
  cart.discountAmount = totals.discountPrice;
  cart.total = totals.totalPrice;
  if (!totals.coupon && cart.couponCode) {
    cart.couponCode = undefined;
  }
  return cart.save();
};

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    let cart = await Cart.findOne({ user: user?._id });
    if (!cart) {
      cart = await Cart.create({ user: user?._id, items: [] });
    }
    res.json(cart);
  })
);

router.put(
  '/items',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const { productId, qty } = req.body;
    const quantity = Number(qty);

    if (!productId || quantity < 1) {
      res.status(400);
      throw new Error('productId and qty are required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (quantity > product.countInStock) {
      res.status(400);
      throw new Error('Requested quantity exceeds stock');
    }

    let cart = await Cart.findOne({ user: user?._id });
    if (!cart) {
      cart = await Cart.create({ user: user?._id, items: [] });
    }

    const existing = cart.items.find((item: any) => String(item.product) === String(product._id));
    const cartPrice = getCartItemPrice(product);
    if (existing) {
      existing.qty = quantity;
      existing.price = cartPrice;
      existing.image = getProductPrimaryImage(product);
      existing.countInStock = product.countInStock;
      existing.useApproxPrice = Boolean(product.useApproxPrice);
      existing.approxPriceMin = product.approxPriceMin;
      existing.approxPriceMax = product.approxPriceMax;
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        image: getProductPrimaryImage(product),
        price: cartPrice,
        qty: quantity,
        countInStock: product.countInStock,
        useApproxPrice: Boolean(product.useApproxPrice),
        approxPriceMin: product.approxPriceMin,
        approxPriceMax: product.approxPriceMax,
      });
    }

    await BehaviorEvent.create({ user: user?._id, product: product._id, eventType: 'cart', metadata: { qty: quantity } });
    res.json(await recalculateCart(cart));
  })
);

router.delete(
  '/items/:productId',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const cart = await Cart.findOne({ user: user?._id });
    if (!cart) {
      res.json({ items: [], subtotal: 0, total: 0 });
      return;
    }

    cart.items = cart.items.filter((item: any) => String(item.product) !== req.params.productId) as any;
    res.json(await recalculateCart(cart));
  })
);

router.post(
  '/coupon',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const cart = await Cart.findOne({ user: user?._id });
    if (!cart) {
      res.status(404);
      throw new Error('Cart not found');
    }

    cart.couponCode = req.body.code ? String(req.body.code).toUpperCase() : undefined;
    res.json(await recalculateCart(cart));
  })
);

router.delete(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    await Cart.findOneAndUpdate({ user: user?._id }, { items: [], couponCode: undefined, discountAmount: 0, subtotal: 0, total: 0 });
    res.json({ message: 'Cart cleared' });
  })
);

export default router;
