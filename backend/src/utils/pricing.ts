import Coupon, { ICoupon } from '../models/Coupon';

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const getCouponDiscount = (subtotal: number, coupon?: ICoupon | null) => {
  if (!coupon) {
    return 0;
  }

  const now = new Date();
  const expired = coupon.expiresAt ? coupon.expiresAt < now : false;
  const usageExceeded = typeof coupon.usageLimit === 'number' && coupon.usedCount >= coupon.usageLimit;

  if (!coupon.isActive || expired || usageExceeded || subtotal < coupon.minOrderAmount) {
    return 0;
  }

  const rawDiscount = coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value;
  const cappedDiscount = coupon.maxDiscountAmount ? Math.min(rawDiscount, coupon.maxDiscountAmount) : rawDiscount;

  return roundMoney(Math.min(subtotal, cappedDiscount));
};

export const findValidCoupon = async (code?: string) => {
  if (!code) {
    return null;
  }

  return Coupon.findOne({ code: code.toUpperCase(), isActive: true });
};

export type ShippingOption = 'standard' | 'express' | 'priority';

export const shippingRates: Record<ShippingOption, number> = {
  standard: 49,
  express: 99,
  priority: 149,
};

export const shippingLabels: Record<ShippingOption, string> = {
  standard: 'Standard delivery',
  express: 'Express delivery',
  priority: 'Priority delivery',
};

export const calculateOrderTotals = async (
  subtotal: number,
  couponCode?: string,
  shippingOption: ShippingOption = 'standard'
) => {
  const coupon = await findValidCoupon(couponCode);
  const discountPrice = getCouponDiscount(subtotal, coupon);
  const netSubtotal = subtotal - discountPrice;
  const taxPrice = roundMoney(netSubtotal * 0.05);
  const shippingPrice = shippingOption === 'standard' ? (netSubtotal > 1499 ? 0 : shippingRates.standard) : shippingRates[shippingOption];
  const totalPrice = roundMoney(netSubtotal + taxPrice + shippingPrice);

  return {
    coupon,
    discountPrice,
    taxPrice,
    shippingPrice,
    shippingOption,
    totalPrice,
  };
};
