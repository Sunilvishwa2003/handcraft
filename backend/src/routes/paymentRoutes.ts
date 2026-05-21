import express from 'express';
import Cart from '../models/Cart';
import Order from '../models/Order';
import { optionalProtect } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../types/http';
import asyncHandler from '../utils/asyncHandler';
import {
  createOrderFromCheckout,
  markOrderPaid,
  prepareCheckoutDetails,
  resolveShippingOption,
  ShippingAddressPayload,
  PaymentResultPayload,
} from '../services/orderCheckoutService';
import { getRazorpayClient, getRazorpayKeyId, verifyRazorpaySignature } from '../services/razorpayService';
import { buildOrderTelegramMessage } from '../utils/buildOrderTelegramMessage';
import { sendTelegramMessage } from '../utils/sendTelegramMessage';

const router = express.Router();
const MIN_RAZORPAY_AMOUNT = 100;

type RazorpayApiError = Error & {
  statusCode?: number;
  error?: {
    description?: string;
  };
};

const validateShippingAddress = (shippingAddress: Partial<ShippingAddressPayload> | undefined): ShippingAddressPayload => {
  if (
    !shippingAddress?.address?.trim() ||
    !shippingAddress.city?.trim() ||
    !shippingAddress.postalCode?.trim() ||
    !shippingAddress.country?.trim()
  ) {
    throw new Error('A complete shipping address is required to verify payment');
  }

  return {
    address: shippingAddress.address.trim(),
    city: shippingAddress.city.trim(),
    postalCode: shippingAddress.postalCode.trim(),
    country: shippingAddress.country.trim(),
    phone: shippingAddress.phone?.trim() || '',
  };
};

const getTrimmedBodyValue = (value: unknown) => String(value || '').trim();

const createRazorpayOrder = async ({
  amount,
  currency,
  receipt,
  notes,
  res,
}: {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
  res: express.Response;
}) => {
  try {
    return await getRazorpayClient().orders.create({
      amount,
      currency,
      receipt,
      notes,
    });
  } catch (error) {
    const razorpayError = error as RazorpayApiError;
    if (razorpayError.statusCode === 401) {
      res.status(401);
      throw new Error('Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    res.status(500);
    throw new Error(razorpayError.error?.description || razorpayError.message || 'Could not create Razorpay order');
  }
};

router.post(
  '/create-order',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const existingOrderId = getTrimmedBodyValue(req.body.existingOrderId);
    const requestedReceipt = getTrimmedBodyValue(req.body.receipt);
    const requestedCurrency = getTrimmedBodyValue(req.body.currency || 'INR').toUpperCase();
    const hasRequestedAmount = req.body.amount !== undefined && req.body.amount !== null && String(req.body.amount).trim() !== '';
    let amount = 0;

    if (hasRequestedAmount) {
      const parsedAmount = Number(req.body.amount);
      if (!Number.isFinite(parsedAmount)) {
        res.status(400);
        throw new Error('Amount must be a valid number in paise');
      }

      amount = Math.round(parsedAmount);
    } else if (existingOrderId) {
      const existingOrder = await Order.findById(existingOrderId);
      if (!existingOrder || !user || (!user.isAdmin && String(existingOrder.user) !== String(user._id))) {
        res.status(404);
        throw new Error('Order not found');
      }

      if (existingOrder.status === 'cancelled') {
        res.status(400);
        throw new Error('Cancelled orders cannot be paid');
      }

      if (existingOrder.isPaid) {
        res.status(400);
        throw new Error('This order has already been paid');
      }

      amount = Math.round(existingOrder.totalPrice * 100);
    } else {
      const cart = await Cart.findOne({ user: user?._id });
      const rawItems = req.body.items || cart?.items || [];
      if (!Array.isArray(rawItems) || !rawItems.length) {
        res.status(400);
        throw new Error('No cart items provided');
      }
      const couponCode = req.body.couponCode || cart?.couponCode;
      const shippingOption = resolveShippingOption(req.body.shippingOption);
      const { totals } = await prepareCheckoutDetails({
        userId: user?._id ? String(user._id) : undefined,
        rawItems,
        couponCode,
        shippingOption,
        paymentMethod: 'razorpay',
      });

      amount = Math.round(totals.totalPrice * 100);
    }

    if (requestedCurrency.length !== 3) {
      res.status(400);
      throw new Error('Currency must be a 3-letter ISO code');
    }

    if (amount < MIN_RAZORPAY_AMOUNT) {
      res.status(400);
      throw new Error(`Minimum Razorpay amount is ${MIN_RAZORPAY_AMOUNT} paise`);
    }

    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency: requestedCurrency,
      receipt: (requestedReceipt || (existingOrderId ? `order_${existingOrderId}` : `checkout_${Date.now()}`)).slice(0, 40),
      notes: {
        source: existingOrderId ? 'existing-order' : hasRequestedAmount ? 'manual-amount' : 'checkout',
        userId: String(user?._id || 'guest'),
        existingOrderId,
      },
      res,
    });

    res.json({
      keyId: getRazorpayKeyId(),
      orderId: razorpayOrder.id,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  })
);

router.post(
  '/verify',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const razorpayOrderId = getTrimmedBodyValue(req.body.razorpayOrderId || req.body.razorpay_order_id || req.body.orderId);
    const razorpayPaymentId = getTrimmedBodyValue(req.body.razorpayPaymentId || req.body.razorpay_payment_id || req.body.paymentId);
    const razorpaySignature = getTrimmedBodyValue(req.body.razorpaySignature || req.body.razorpay_signature || req.body.signature);
    const existingOrderId = getTrimmedBodyValue(req.body.existingOrderId);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400);
      throw new Error('Razorpay payment details are required');
    }

    if (!verifyRazorpaySignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })) {
      res.status(400);
      throw new Error('Payment signature verification failed');
    }

    let razorpayPayment:
      | {
          status?: string;
          email?: string;
          method?: string;
          amount?: number;
        }
      | undefined;

    try {
      const fetchedPayment = await getRazorpayClient().payments.fetch(razorpayPaymentId);
      razorpayPayment = {
        status: fetchedPayment.status,
        email: fetchedPayment.email,
        method: fetchedPayment.method,
        amount: typeof fetchedPayment.amount === 'number' ? fetchedPayment.amount : Number(fetchedPayment.amount),
      };
    } catch {
      razorpayPayment = undefined;
    }

    const paymentResult: PaymentResultPayload = {
      id: razorpayPaymentId,
      status: razorpayPayment?.status || 'paid',
      update_time: new Date().toISOString(),
      email_address: razorpayPayment?.email || user?.email || '',
      provider: 'razorpay',
      method: razorpayPayment?.method,
      order_id: razorpayOrderId,
      signature: razorpaySignature,
    };

    if (existingOrderId) {
      const existingOrder = await Order.findById(existingOrderId);
      if (!existingOrder || !user || (!user.isAdmin && String(existingOrder.user) !== String(user._id))) {
        res.status(404);
        throw new Error('Order not found');
      }
      if (existingOrder.status === 'cancelled') {
        res.status(400);
        throw new Error('Cancelled orders cannot be paid');
      }
      if (existingOrder.isPaid) {
        res.json({ verified: true, order: existingOrder });
        return;
      }
      const order = await markOrderPaid({
        order: existingOrder,
        user,
        paymentMethod: 'razorpay',
        paymentResult,
        paymentMessage: 'Payment verified via Razorpay',
      });

      res.json({ verified: true, order });
      return;
    }

    const duplicateOrder = await Order.findOne({ 'paymentResult.id': razorpayPaymentId });
    if (duplicateOrder) {
      res.json({ verified: true, order: duplicateOrder });
      return;
    }

    const cart = await Cart.findOne({ user: user?._id });
    const rawItems = req.body.items || cart?.items || [];
    if (!Array.isArray(rawItems) || !rawItems.length) {
      res.status(400);
      throw new Error('No cart items provided');
    }
    const couponCode = req.body.couponCode || cart?.couponCode;
    const shippingOption = resolveShippingOption(req.body.shippingOption);
    let shippingAddress: ShippingAddressPayload;
    try {
      shippingAddress = validateShippingAddress(req.body.shippingAddress);
    } catch (error) {
      res.status(400);
      throw error;
    }
    const { orderItems, totals, fraud } = await prepareCheckoutDetails({
      userId: user?._id ? String(user._id) : undefined,
      rawItems,
      couponCode,
      shippingOption,
      paymentMethod: 'razorpay',
    });

    if (typeof razorpayPayment?.amount === 'number' && razorpayPayment.amount !== Math.round(totals.totalPrice * 100)) {
      res.status(400);
      throw new Error('Paid amount does not match the latest order total');
    }

    const order = await createOrderFromCheckout({
      user,
      shippingAddress,
      shippingOption,
      paymentMethod: 'razorpay',
      paymentResult,
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

    res.json({ verified: true, order });
  })
);

export default router;
