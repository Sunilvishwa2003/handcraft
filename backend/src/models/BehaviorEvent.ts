import mongoose, { Document, Schema } from 'mongoose';

export interface IBehaviorEvent extends Document {
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  product?: mongoose.Types.ObjectId;
  eventType: 'view' | 'search' | 'cart' | 'wishlist' | 'purchase' | 'checkout' | 'ai-chat';
  query?: string;
  metadata: Record<string, unknown>;
  riskScore: number;
}

const behaviorEventSchema = new Schema<IBehaviorEvent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    eventType: {
      type: String,
      enum: ['view', 'search', 'cart', 'wishlist', 'purchase', 'checkout', 'ai-chat'],
      required: true,
      index: true,
    },
    query: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    riskScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

behaviorEventSchema.index({ user: 1, createdAt: -1 });
behaviorEventSchema.index({ product: 1, eventType: 1 });

const BehaviorEvent = mongoose.model<IBehaviorEvent>('BehaviorEvent', behaviorEventSchema);
export default BehaviorEvent;
