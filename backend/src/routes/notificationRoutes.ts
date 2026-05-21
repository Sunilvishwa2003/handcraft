import express from 'express';
import Notification from '../models/Notification';
import { admin, protect } from '../middleware/authMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';
import { emitOffer, emitToUser } from '../services/realtimeService';

const router = express.Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const notifications = await Notification.find({ $or: [{ user: user?._id }, { user: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  })
);

router.patch(
  '/:id/read',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: user?._id }, { user: { $exists: false } }] },
      { read: true },
      { returnDocument: 'after' }
    );
    res.json(notification);
  })
);

router.patch(
  '/read-all',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    await Notification.updateMany(
      { $or: [{ user: user?._id }, { user: { $exists: false } }], read: false },
      { read: true }
    );

    const notifications = await Notification.find({ $or: [{ user: user?._id }, { user: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  })
);

router.post(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const notification = await Notification.create(req.body);
    if (notification.user) {
      emitToUser(String(notification.user), 'notification', notification);
    } else {
      emitOffer(notification);
    }
    res.status(201).json(notification);
  })
);

export default router;
