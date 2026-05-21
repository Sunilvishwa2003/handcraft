import mongoose, { Document, Schema } from 'mongoose';

export const AD_PLACEMENTS = ['home', 'stone', 'stone-name-board', 'wood', 'metal', 'home-decor'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export interface IAd extends Document {
  title?: string;
  description?: string;
  imageUrl: string;
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  targetUrl: string;
  product?: mongoose.Types.ObjectId;
  placements: AdPlacement[];
  active: boolean;
  sortOrder: number;
}

const adSchema = new Schema<IAd>(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    desktopImage: { type: String },
    tabletImage: { type: String },
    mobileImage: { type: String },
    targetUrl: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    placements: {
      type: [{ type: String, enum: AD_PLACEMENTS }],
      default: ['home'],
    },
    active: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Ad = mongoose.model<IAd>('Ad', adSchema);

export default Ad;
