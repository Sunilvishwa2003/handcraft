import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthenticatedRequest } from '../types/http';
import { isAdmin } from '../utils/isAdmin';

type JwtPayload = {
  id?: string;
};

export const protect: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    res.status(401).json({ message: 'Not authorized, token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me') as JwtPayload;
    if (!decoded.id) {
      res.status(401).json({ message: 'Not authorized, token invalid' });
      return;
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    const nextAdminState = isAdmin(user.email);
    if (user.isAdmin !== nextAdminState) {
      user.isAdmin = nextAdminState;
      await user.save();
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

export const optionalProtect: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me') as JwtPayload;
    if (decoded.id) {
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        const nextAdminState = isAdmin(user.email);
        if (user.isAdmin !== nextAdminState) {
          user.isAdmin = nextAdminState;
          await user.save();
        }
        (req as AuthenticatedRequest).user = user;
      }
    }
  } catch (error) {
    // Ignore invalid tokens for optional endpoints
  }
  next();
};

export const admin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  if (user?.isAdmin) {
    next();
    return;
  }

  res.status(403).json({ message: 'Admin access required' });
};
