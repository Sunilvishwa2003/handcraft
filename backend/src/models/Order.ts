import mongoose, { Document, Schema } from 'mongoose';
import { IProduct } from './Product';
import { IUser } from './User';
import { PRODUCT_IMAGE_PLACEHOLDER } from '../utils/productImage';

interface IOrderItem {
  name: string;
  qty: number;
  image: string;
  price: number;
  originalPrice?: number;
  useApproxPrice?: boolean;
  approxPriceMin?: number;
  approxPriceMax?: number;
  product: mongoose.Types.ObjectId | IProduct;
}

interface ITrackingEvent {
  status: string;
  message: string;
  location?: string;
  timestamp: Date;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId | IUser;
  orderItems: IOrderItem[];
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  shippingOption: 'standard' | 'express' | 'priority';
  estimatedDelivery?: string;
  paymentMethod: string;
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address?: string;
    provider?: string;
    method?: string;
    order_id?: string;
    signature?: string;
  };
  taxPrice: number;
  shippingPrice: number;
  discountPrice: number;
  couponCode?: string;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'out-for-delivery' | 'delivered' | 'cancelled';
  trackingEvents: ITrackingEvent[];
  fraudRiskScore: number;
  fraudFlags: string[];
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, default: PRODUCT_IMAGE_PLACEHOLDER, trim: true },
        price: { type: Number, required: true },
        originalPrice: { type: Number },
        useApproxPrice: { type: Boolean, default: false },
        approxPriceMin: { type: Number },
        approxPriceMax: { type: Number },
        product: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String },
    },
    shippingOption: {
      type: String,
      enum: ['standard', 'express', 'priority'],
      default: 'standard',
    },
    estimatedDelivery: { type: String },
    paymentMethod: { type: String, required: true },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
      provider: { type: String },
      method: { type: String },
      order_id: { type: String },
      signature: { type: String },
    },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    discountPrice: { type: Number, required: true, default: 0.0 },
    couponCode: { type: String },
    totalPrice: { type: Number, required: true, default: 0.0 },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'shipped', 'out-for-delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    trackingEvents: [
      {
        status: { type: String, required: true },
        message: { type: String, required: true },
        location: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    fraudRiskScore: { type: Number, default: 0 },
    fraudFlags: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
