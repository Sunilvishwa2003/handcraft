import BehaviorEvent from '../models/BehaviorEvent';
import Cart from '../models/Cart';
import Coupon from '../models/Coupon';
import Notification from '../models/Notification';
import Order, { IOrder } from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { detectFraud } from './mlService';
import { emitOrderUpdate, emitToUser } from './realtimeService';
import { calculateOrderTotals, roundMoney, ShippingOption } from '../utils/pricing';
import { getProductPrimaryImage } from '../utils/productImage';

type RawOrderItem = {
  product?: string;
  productId?: string;
  qty?: number;
};

type CheckoutUser = {
  _id?: unknown;
  email?: string;
} | null | undefined;

export type PaymentResultPayload = {
  id: string;
  status: string;
  update_time: string;
  email_address?: string;
  provider?: string;
  method?: string;
  order_id?: string;
  signature?: string;
};

export type ShippingAddressPayload = {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
};

const shippingOptions = new Set<ShippingOption>(['standard', 'express', 'priority']);

const getUserId = (user: CheckoutUser) => {
  if (!user?._id) {
    return undefined;
  }

  return String(user._id);
};

const getOrderUserId = (order: IOrder) => {
  const value = (order.user as { _id?: unknown } | undefined)?._id || order.user;
  return value ? String(value) : undefined;
};

export const resolveShippingOption = (value: unknown): ShippingOption => {
  const normalized = String(value || 'standard') as ShippingOption;
  return shippingOptions.has(normalized) ? normalized : 'standard';
};

export const buildOrderItems = async (rawItems: RawOrderItem[]) => {
  const ids = rawItems.map((item) => String(item.product || item.productId)).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } });

  return rawItems.map((item) => {
    const product = products.find((entry) => String(entry._id) === String(item.product || item.productId));
    if (!product) {
      throw new Error('One or more products are no longer available');
    }

    const qty = Number(item.qty || 1);
    if (qty > product.countInStock) {
      throw new Error(`${product.name} has only ${product.countInStock} left in stock`);
    }

    return {
      name: product.name,
      qty,
      image: getProductPrimaryImage(product),
      price: product.price,
      originalPrice: product.originalPrice,
      product: product._id,
    };
  });
};

export const prepareCheckoutDetails = async ({
  userId,
  rawItems,
  couponCode,
  shippingOption,
  paymentMethod,
}: {
  userId?: string;
  rawItems: RawOrderItem[];
  couponCode?: string;
  shippingOption?: ShippingOption;
  paymentMethod?: string;
}) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('No cart items provided');
  }

  const orderItems = await buildOrderItems(rawItems);
  const subtotal = roundMoney(orderItems.reduce((sum, item) => sum + item.price * item.qty, 0));
  const itemCount = orderItems.reduce((sum, item) => sum + item.qty, 0);
  const resolvedShippingOption = resolveShippingOption(shippingOption);
  const totals = await calculateOrderTotals(subtotal, couponCode, resolvedShippingOption, itemCount);
  const fraud = await detectFraud({
    userId: userId || 'undefined',
    totalPrice: totals.totalPrice,
    itemCount,
    paymentMethod,
  });

  return {
    orderItems,
    subtotal,
    totals,
    fraud,
    shippingOption: resolvedShippingOption,
  };
};

export const createOrderFromCheckout = async ({
  user,
  shippingAddress,
  shippingOption,
  paymentMethod,
  paymentResult,
  orderItems,
  totals,
  fraud,
}: {
  user: CheckoutUser;
  shippingAddress: ShippingAddressPayload;
  shippingOption: ShippingOption;
  paymentMethod: string;
  paymentResult?: PaymentResultPayload;
  orderItems: Awaited<ReturnType<typeof buildOrderItems>>;
  totals: Awaited<ReturnType<typeof calculateOrderTotals>>;
  fraud: { score: number; decision: string; flags: string[] };
}) => {
  const userId = getUserId(user);
  const userRef = (user as { _id?: unknown } | undefined)?._id as IOrder['user'] | undefined;
  const isPaid = paymentMethod !== 'cod';
  const placedAt = new Date();
  const order = (await Order.create({
    user: userRef,
    orderItems,
    shippingAddress,
    shippingOption,
    paymentMethod,
    paymentResult: paymentResult || undefined,
    taxPrice: totals.taxPrice,
    shippingPrice: totals.shippingPrice,
    discountPrice: totals.discountPrice,
    couponCode: totals.coupon ? totals.coupon.code : undefined,
    totalPrice: totals.totalPrice,
    isPaid,
    paidAt: isPaid ? placedAt : undefined,
    status: fraud.decision === 'review' ? 'placed' : isPaid ? 'confirmed' : 'placed',
    fraudRiskScore: fraud.score,
    fraudFlags: fraud.flags,
    trackingEvents: [
      {
        status: 'placed',
        message: fraud.decision === 'review' ? 'Order placed and queued for review' : 'Order placed successfully',
        timestamp: placedAt,
      },
      ...(isPaid
        ? [
            {
              status: 'paid',
              message:
                paymentResult?.provider === 'razorpay' ? 'Payment verified via Razorpay' : 'Payment received successfully',
              timestamp: placedAt,
            },
          ]
        : []),
    ],
  })) as IOrder;

  if (userId) {
    await User.findByIdAndUpdate(userId, { $addToSet: { orders: order._id } });
  }

  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: {
          countInStock: -item.qty,
          purchases: item.qty,
          bestSellerScore: item.qty,
          trendingScore: item.qty * 2,
        },
      })
    )
  );

  if (totals.coupon) {
    await Coupon.findByIdAndUpdate(totals.coupon._id, { $inc: { usedCount: 1 } });
  }

  await BehaviorEvent.create({ user: userId, eventType: 'checkout', metadata: { totalPrice: totals.totalPrice }, riskScore: fraud.score });
  await BehaviorEvent.insertMany(
    orderItems.map((item) => ({ user: userId, product: item.product, eventType: 'purchase', metadata: { qty: item.qty } }))
  );

  if (userId) {
    await Cart.findOneAndUpdate({ user: userId }, { items: [], couponCode: undefined, discountAmount: 0, subtotal: 0, total: 0 });

    const notification = await Notification.create({
      user: userId,
      title: 'Order placed',
      message: `Order ${order._id} is ${order.status}.`,
      type: 'order',
      data: { orderId: order._id, status: order.status },
    });
    emitToUser(userId, 'notification', notification);
    emitOrderUpdate(String(order._id), userId, { orderId: order._id, status: order.status, trackingEvents: order.trackingEvents });
  }

  return order;
};

export const markOrderPaid = async ({
  order,
  user,
  paymentMethod,
  paymentResult,
  paymentMessage,
}: {
  order: IOrder;
  user?: CheckoutUser;
  paymentMethod?: string;
  paymentResult: PaymentResultPayload;
  paymentMessage?: string;
}) => {
  if (order.status === 'cancelled') {
    throw new Error('Cancelled orders cannot be paid');
  }

  if (order.isPaid) {
    if (order.paymentResult?.id === paymentResult.id) {
      return order;
    }

    throw new Error('This order has already been paid');
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.paymentMethod = paymentMethod || order.paymentMethod;
  order.paymentResult = paymentResult;

  if (order.status === 'placed' && order.fraudRiskScore < 70) {
    order.status = 'confirmed';
  }

  order.trackingEvents.push({
    status: 'paid',
    message: paymentMessage || 'Payment received successfully',
    timestamp: new Date(),
  });
  await order.save();

  const userId = getUserId(user) || getOrderUserId(order);
  if (userId) {
    const notification = await Notification.create({
      user: userId,
      title: 'Payment received',
      message: `Payment for order ${order._id} was confirmed successfully.`,
      type: 'order',
      data: { orderId: order._id, status: order.status },
    });
    emitToUser(userId, 'notification', notification);
    emitOrderUpdate(String(order._id), userId, { orderId: order._id, status: order.status, trackingEvents: order.trackingEvents });
  }

  return order;
};
