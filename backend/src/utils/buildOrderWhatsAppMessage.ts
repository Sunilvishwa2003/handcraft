import { IOrder } from '../models/Order';

export type OrderWhatsAppMessageInput = {
  orderId: string;
  customerName?: string;
  phoneNumber?: string;
  paymentStatus?: string;
  totalPrice: number;
  paymentMethod?: string;
  trackingNumber?: string;
  shippingAddress?: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  orderItems?: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  orderNotes?: string;
};

export const buildOrderWhatsAppMessage = (input: OrderWhatsAppMessageInput): string => {
  const items = input.orderItems || [];
  const lineItems = items
    .map((item) => `• ${item.name} x${item.qty} @ ₹${item.price.toLocaleString()}`)
    .join('\n');

  const addressLines = [
    input.shippingAddress?.address,
    input.shippingAddress?.city,
    input.shippingAddress?.postalCode,
    input.shippingAddress?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const phoneLine = input.phoneNumber ? `Phone: ${input.phoneNumber}` : '';
  const trackingLine = input.trackingNumber ? `Tracking No: ${input.trackingNumber}` : '';
  const notesLine = input.orderNotes ? `Notes: ${input.orderNotes}` : '';

  return [
    `🛒 New order received!`,
    `Order ID: ${input.orderId}`,
    `Customer: ${input.customerName || 'Guest'}`,
    phoneLine,
    `Payment: ${input.paymentStatus || 'Pending'} (${input.paymentMethod || 'N/A'})`,
    `Amount: ₹${input.totalPrice.toLocaleString()}`,
    '',
    `Shipping: ${addressLines}`,
    trackingLine,
    notesLine,
    ``,
    `Items:`,
    lineItems || '• (no items)',
  ]
    .filter(Boolean)
    .join('\n');
};
