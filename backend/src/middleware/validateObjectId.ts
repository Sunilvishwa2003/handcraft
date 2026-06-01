import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

export default function validateObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (!value) {
      return res.status(400).json({ success: false, message: 'Missing id parameter' });
    }

    if (!mongoose.Types.ObjectId.isValid(String(value))) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    return next();
  };
}
