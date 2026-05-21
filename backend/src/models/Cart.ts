import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  name: string;
  image: string;
  price: number;
  qty: number;
  countInStock: number;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  total: number;
}

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        name: { type: String, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        qty: { type: Number, required: true, min: 1 },
        countInStock: { type: Number, required: true },
      },
    ],
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Cart = mongoose.model<ICart>('Cart', cartSchema);
export default Cart;
