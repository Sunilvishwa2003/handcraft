import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  avatarUrl?: string;
  profileImage?: string;
  phone?: string;
  isAdmin: boolean;
  isVendor: boolean;
  storeName?: string;
  storeDescription?: string;
  sellerRating: number;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  addresses: {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }[];
  wishlist: mongoose.Types.ObjectId[];
  orders: mongoose.Types.ObjectId[];
  recentlyViewed: {
    product: mongoose.Types.ObjectId;
    viewedAt: Date;
  }[];
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String },
    profileImage: { type: String },
    phone: { type: String, trim: true },
    isAdmin: { type: Boolean, required: true, default: false },
    isVendor: { type: Boolean, required: true, default: false },
    storeName: { type: String },
    storeDescription: { type: String },
    sellerRating: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    orders: { type: [{ type: Schema.Types.ObjectId, ref: 'Order' }], default: [] },
    recentlyViewed: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  if (!this.password) {
    return false;
  }

  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password before saving
userSchema.pre('save', async function (this: IUser) {
  if (!this.isModified('password')) {
    return;
  }
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;
