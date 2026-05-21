import express from 'express';
import Cart from '../models/Cart';
import Notification from '../models/Notification';
import Order from '../models/Order';
import Product from '../models/Product';
import { admin, optionalProtect, protect } from '../middleware/authMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';
import {
  createOrderFromCheckout,
  markOrderPaid,
  PaymentResultPayload,
  prepareCheckoutDetails,
  resolveShippingOption,
} from '../services/orderCheckoutService';
import { emitOrderUpdate, emitToUser } from '../services/realtimeService';
import { buildOrderTelegramMessage } from '../utils/buildOrderTelegramMessage';
import { sendTelegramMessage } from '../utils/sendTelegramMessage';

const router = express.Router();

router.post(
  '/summary',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const cart = await Cart.findOne({ user: user?._id });
    const rawItems = req.body.items || cart?.items || [];
    if (!Array.isArray(rawItems) || !rawItems.length) {
      res.status(400);
      throw new Error('No cart items provided');
    }
    const couponCode = req.body.couponCode || cart?.couponCode;
    const shippingOption = resolveShippingOption(req.body.shippingOption);
    const { orderItems, subtotal, totals, fraud } = await prepareCheckoutDetails({
      userId: user?._id ? String(user._id) : undefined,
      rawItems,
      couponCode,
      shippingOption,
      paymentMethod: req.body.paymentMethod,
    });

    res.json({ orderItems, subtotal, ...totals, fraud });
  })
);

router.post(
  '/',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const cart = await Cart.findOne({ user: user?._id });
    const rawItems = req.body.items || cart?.items || [];

    if (!rawItems.length) {
      res.status(400);
      throw new Error('No order items');
    }

    const shippingAddress = req.body.shippingAddress;
    if (
      !shippingAddress?.address?.trim() ||
      !shippingAddress?.city?.trim() ||
      !shippingAddress?.postalCode?.trim() ||
      !shippingAddress?.country?.trim()
    ) {
      res.status(400);
      throw new Error('A complete shipping address is required');
    }

    const paymentMethod = String(req.body.paymentMethod || 'cod');
    const couponCode = req.body.couponCode || cart?.couponCode;
    const shippingOption = resolveShippingOption(req.body.shippingOption);
    const { orderItems, totals, fraud } = await prepareCheckoutDetails({
      userId: user?._id ? String(user._id) : undefined,
      rawItems,
      couponCode,
      shippingOption,
      paymentMethod,
    });

    const order = await createOrderFromCheckout({
      user,
      shippingAddress: {
        address: String(shippingAddress.address).trim(),
        city: String(shippingAddress.city).trim(),
        postalCode: String(shippingAddress.postalCode).trim(),
        country: String(shippingAddress.country).trim(),
        phone: String(shippingAddress.phone || '').trim(),
      },
      shippingOption,
      paymentMethod,
      paymentResult: req.body.paymentResult || undefined,
      orderItems,
      totals,
      fraud,
    });

    try {
      const message = buildOrderTelegramMessage({
        ...order.toObject(),
        user: user
          ? {
              name: user.name,
              email: user.email,
              phone: user.phone,
            }
          : undefined,
      });
      await sendTelegramMessage(message);
    } catch (error) {
      console.error(`[telegram] Failed to send order notification for order ${order._id}:`, error);
    }

    res.status(201).json(order);
  })
);

router.get(
  '/my',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const orders = await Order.find({ user: user?._id }).sort({ createdAt: -1 });
    res.json(orders);
  })
);

router.get(
  '/:id/tracking',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const order = await Order.findById(req.params.id);
    if (!order || (!user?.isAdmin && String(order.user) !== String(user?._id))) {
      res.status(404);
      throw new Error('Order not found');
    }
    res.json({ status: order.status, trackingEvents: order.trackingEvents });
  })
);

router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order || (!user?.isAdmin && String(order.user._id || order.user) !== String(user?._id))) {
      res.status(404);
      throw new Error('Order not found');
    }
    res.json(order);
  })
);

router.post(
  '/:id/pay',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const order = await Order.findById(req.params.id);
    if (!order || String(order.user) !== String(user?._id)) {
      res.status(404);
      throw new Error('Order not found');
    }
    if (order.status === 'cancelled') {
      res.status(400);
      throw new Error('Cancelled orders cannot be paid');
    }
    if (order.isPaid) {
      res.status(400);
      throw new Error('This order has already been paid');
    }

    const paymentResult = req.body.paymentResult as PaymentResultPayload | undefined;
    if (!paymentResult?.id) {
      res.status(400);
      throw new Error('Verified payment details are required. Use /api/payment/verify for Razorpay payments.');
    }

    const updatedOrder = await markOrderPaid({
      order,
      user,
      paymentMethod: req.body.paymentMethod || order.paymentMethod,
      paymentResult,
      paymentMessage: req.body.message || 'Payment received successfully',
    });

    res.json(updatedOrder);
  })
);

router.post(
  '/:id/cancel',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const order = await Order.findById(req.params.id);
    if (!order || String(order.user) !== String(user?._id)) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (['shipped', 'out-for-delivery', 'delivered', 'cancelled'].includes(order.status)) {
      res.status(400);
      throw new Error(`Order cannot be cancelled because it is already ${order.status}. Please contact support.`);
    }

    order.status = 'cancelled';
    order.trackingEvents.push({
      status: 'cancelled',
      message: 'Order was cancelled by the user',
      timestamp: new Date(),
    });
    await order.save();

    await Promise.all(
      order.orderItems.map((item) =>
        Product.findByIdAndUpdate(item.product, {
          $inc: { countInStock: item.qty },
        })
      )
    );

    const notification = await Notification.create({
      user: order.user as any,
      title: 'Order cancelled',
      message: `Your order ${order._id} has been cancelled successfully.`,
      type: 'order',
      data: { orderId: order._id, status: order.status },
    });
    emitToUser(String(order.user), 'notification', notification);
    emitOrderUpdate(String(order._id), String(order.user), { orderId: order._id, status: order.status, trackingEvents: order.trackingEvents });

    res.json(order);
  })
);

router.patch(
  '/:id/status',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    order.status = req.body.status || order.status;
    if (order.status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }
    order.trackingEvents.push({
      status: order.status,
      message: req.body.message || `Order status updated to ${order.status}`,
      location: req.body.location,
      timestamp: new Date(),
    });
    await order.save();

    const notification = await Notification.create({
      user: order.user as any,
      title: 'Order update',
      message: `Your order is now ${order.status}.`,
      type: 'order',
      data: { orderId: order._id, status: order.status },
    });
    emitToUser(String(order.user), 'notification', notification);
    emitOrderUpdate(String(order._id), String(order.user), { orderId: order._id, status: order.status, trackingEvents: order.trackingEvents });

    res.json(order);
  })
);

export default router;
