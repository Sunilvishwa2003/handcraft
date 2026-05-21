import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'order' | 'offer' | 'system' | 'chat' | 'project' | 'wishlist';
  read: boolean;
  data: Record<string, unknown>;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['order', 'offer', 'system', 'chat', 'project', 'wishlist'], default: 'system' },
    read: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
