import express from 'express';
import Product from '../models/Product';
import User from '../models/User';
import BehaviorEvent from '../models/BehaviorEvent';
import { protect } from '../middleware/authMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';

const router = express.Router();

router.get(
  '/ids',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id).select('wishlist');
    res.json((user?.wishlist || []).map((item) => String(item)));
  })
);

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id).populate('wishlist');
    res.json(user?.wishlist || []);
  })
);

router.post(
  '/:productId',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const product = await Product.findById(req.params.productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const updated = await User.findByIdAndUpdate(user?._id, { $addToSet: { wishlist: product._id } }, { returnDocument: 'after' }).populate('wishlist');
    await BehaviorEvent.create({ user: user?._id, product: product._id, eventType: 'wishlist', metadata: {} });

    res.json(updated?.wishlist || []);
  })
);

router.delete(
  '/:productId',
  protect,
  asyncHandler(async (req, res) => {
    const user = (req as AuthenticatedRequest).user;
    const updated = await User.findByIdAndUpdate(user?._id, { $pull: { wishlist: req.params.productId } }, { returnDocument: 'after' }).populate('wishlist');
    res.json(updated?.wishlist || []);
  })
);

export default router;
