export const generateOrderId = (): string => {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().slice(-10);
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${suffix}`;
};
