import express from 'express';
import { protect } from '../middleware/authMiddleware';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

router.get(
  '/my',
  protect,
  asyncHandler(async (req, res) => {
    // Custom project support is not available yet in the backend.
    // Return an empty array rather than 404 so the frontend renders gracefully.
    res.json([]);
  })
);

router.get(
  '/',
  protect,
  asyncHandler(async (_req, res) => {
    // Admin listing for custom projects is not implemented yet.
    // Returning an empty array allows the admin UI to render without a 404.
    res.json([]);
  })
);

export default router;
