import mongoose, { CallbackWithoutResultAndOptionalError, Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  discountPercentage: number;
  useApproxPrice?: boolean;
  approxPriceMin?: number;
  approxPriceMax?: number;
  brand: string;
  category: string;
  subcategory?: string;
  status: 'active' | 'inactive' | 'draft';
  keywords: string[];
  images: Array<string | { url: string; alt?: string }>;
  model3dUrl?: string; // URL to the GLB/GLTF model
  rating: number;
  numReviews: number;
  countInStock: number;
  stockAlertThreshold: number;
  availability: 'in-stock' | 'out-of-stock' | 'preorder';
  specs: string[];
  tags: string[];
  semanticKeywords: string[];
  vendorName?: string;
  vendorVerified?: boolean;
  bestSellerScore: number;
  trendingScore: number;
  purchases: number;
  views: number;
  featured: boolean;
  demandScore: number;
  customizationOptions?: {
    materials: {
      label: string;
      priceMultiplier: number;
      description?: string;
    }[];
    sizes: {
      label: string;
      priceMultiplier: number;
      dimensions?: string;
    }[];
    finishes: {
      label: string;
      priceMultiplier: number;
    }[];
    textures: {
      label: string;
      priceMultiplier: number;
    }[];
    styles: {
      label: string;
      priceMultiplier: number;
    }[];
    engravingBaseFee?: number;
  };
  // New fields for custom pricing notice
  isCustomPricing?: boolean;
  pricingNoticeMessage?: string;
}

const optionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    priceMultiplier: { type: Number, required: true, default: 1 },
    description: { type: String, trim: true },
    dimensions: { type: String, trim: true },
  },
  { _id: false }
);

const customizationOptionsSchema = new Schema(
  {
    materials: { type: [optionSchema], default: [] },
    sizes: { type: [optionSchema], default: [] },
    finishes: { type: [optionSchema], default: [] },
    textures: { type: [optionSchema], default: [] },
    styles: { type: [optionSchema], default: [] },
    engravingBaseFee: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPercentage: { type: Number, required: true, default: 0 },
    useApproxPrice: { type: Boolean, default: false, index: true },
    approxPriceMin: { type: Number },
    approxPriceMax: { type: Number },
    brand: { type: String, required: true, default: 'Handcrafts' },
    category: { type: String, required: true },
    subcategory: { type: String },
    slug: { type: String, trim: true, lowercase: true, index: true },
    status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active', index: true },
    keywords: { type: [String], default: [], index: true },
    shortDescription: { type: String, trim: true },
    images: {
      type: [Schema.Types.Mixed],
      required: true,
      default: [],
    },
    model3dUrl: { type: String },

    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
    countInStock: { type: Number, required: true, default: 0 },
    stockAlertThreshold: { type: Number, required: true, default: 5 },
    availability: {
      type: String,
      enum: ['in-stock', 'out-of-stock', 'preorder'],
      default: 'in-stock',
      index: true,
    },
    specs: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    semanticKeywords: { type: [String], default: [] },
    vendorName: { type: String, default: 'Handcrafts' },
    vendorVerified: { type: Boolean, default: false, index: true },
    bestSellerScore: { type: Number, default: 0, index: true },
    trendingScore: { type: Number, default: 0, index: true },
    purchases: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    demandScore: { type: Number, default: 1 },
    customizationOptions: { type: customizationOptionsSchema, default: undefined },
    isCustomPricing: { type: Boolean, default: false, index: true },
    pricingNoticeMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

productSchema.index({
  name: 'text',
  description: 'text',
  brand: 'text',
  category: 'text',
  tags: 'text',
  keywords: 'text',
  semanticKeywords: 'text',
});

// Additional indexes for faster lookup
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
// `tags` and `semanticKeywords` are included in the text index above;
// removing single-field indexes to avoid duplicate/overlapping indexes.
// productSchema.index({ tags: 1 });
// productSchema.index({ semanticKeywords: 1 });

// Pre-save hook: normalize images array to objects { url, alt }
productSchema.pre('save', function (this: any, next: any) {
  if (Array.isArray(this.images) && this.images.length) {
    this.images = this.images.map((item: any) => {
      if (!item) return { url: '', alt: '' };
      if (typeof item === 'string') {
        return { url: item, alt: '' };
      }
      return { url: item.url || '', alt: item.alt || '' };
    });
  }

  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  if (!this.shortDescription && this.description) {
    this.shortDescription = String(this.description).trim().slice(0, 180);
  }

  if (!this.useApproxPrice) {
    this.approxPriceMin = undefined;
    this.approxPriceMax = undefined;
  } else if (typeof this.approxPriceMin === 'number' && typeof this.approxPriceMax === 'number') {
    if (this.approxPriceMax < this.approxPriceMin) {
      this.approxPriceMax = this.approxPriceMin;
    }
  }

  // When approximate pricing is enabled, normalize the main price to 0
  // so that site displays approx ranges instead of a single price.
  if (this.useApproxPrice) {
    this.price = 0;
  }

  next();
});

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;
