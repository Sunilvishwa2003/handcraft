export type OrderTelegramMessageInput = {
  _id: unknown;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  shippingAddress?: {
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
  } | null;
  orderItems?: Array<{
    name?: string | null;
    qty?: number | null;
  }> | null;
  totalPrice?: number | null;
  paymentMethod?: string | null;
  status?: string | null;
};

const humanize = (value: string, fallback: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatAmount = (value: number) => {
  const isWholeNumber = Number.isInteger(value);

  return value.toLocaleString('en-IN', {
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export const buildOrderTelegramMessage = (order: OrderTelegramMessageInput): string => {
  const customerName = order.user?.name?.trim() || 'Guest customer';
  const phoneNumber = order.shippingAddress?.phone?.trim() || order.user?.phone?.trim() || 'Not provided';
  const addressLines = [
    order.shippingAddress?.address?.trim() || '',
    [order.shippingAddress?.city?.trim(), order.shippingAddress?.postalCode?.trim()].filter(Boolean).join(' - '),
    order.shippingAddress?.country?.trim() || '',
  ].filter(Boolean);
  const fullAddress = addressLines.length ? addressLines.join('\n') : 'Address not provided';
  const items = order.orderItems?.length
    ? order.orderItems.map((item) => `• ${item.name?.trim() || 'Unnamed product'} x ${item.qty || 0}`).join('\n')
    : '• No items found';
  const totalAmount = formatAmount(Number(order.totalPrice || 0));
  const paymentMethod = humanize(String(order.paymentMethod || ''), 'Unknown');
  const orderStatus = humanize(String(order.status || ''), 'Unknown');

  return [
    '🛒 New Order Received',
    '',
    `🆔 Order ID: ${String(order._id)}`,
    '',
    `👤 Customer: ${customerName}`,
    `📞 Phone: ${phoneNumber}`,
    '',
    '📍 Address:',
    fullAddress,
    '',
    '📦 Items:',
    items,
    '',
    `💰 Total: ₹${totalAmount}`,
    `💳 Payment: ${paymentMethod}`,
    `📌 Status: ${orderStatus}`,
  ].join('\n');
};
