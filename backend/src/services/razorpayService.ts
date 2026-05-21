import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';

let razorpayClient: Razorpay | null = null;

const getTrimmedEnv = (value?: string) => value?.trim() || '';

export const getRazorpayKeyId = () => getTrimmedEnv(process.env.RAZORPAY_KEY_ID);
export const getRazorpayKeySecret = () => getTrimmedEnv(process.env.RAZORPAY_KEY_SECRET);

export const isRazorpayConfigured = () => Boolean(getRazorpayKeyId() && getRazorpayKeySecret());

export const getRazorpayClient = () => {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured on the server');
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: getRazorpayKeyId(),
      key_secret: getRazorpayKeySecret(),
    });
  }

  return razorpayClient;
};

export const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const expectedSignature = createHmac('sha256', getRazorpayKeySecret())
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
};
