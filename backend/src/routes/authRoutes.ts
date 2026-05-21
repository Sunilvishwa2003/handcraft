import express from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import { protect } from '../middleware/authMiddleware';
import { isAdmin } from '../utils/isAdmin';
import generateToken from '../utils/generateToken';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';

const router = express.Router();
let googleClient: OAuth2Client | null = null;

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return null;
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(clientId);
  }

  return googleClient;
};

const buildAuthResponse = (user: {
  _id: unknown;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarUrl?: string;
  profileImage?: string;
  phone?: string;
}) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: isAdmin(user.email),
  avatarUrl: user.avatarUrl,
  profileImage: user.profileImage || user.avatarUrl,
  phone: user.phone,
  token: generateToken(String(user._id)),
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      res.status(400);
      throw new Error('Name, email, and password are required');
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      isAdmin: isAdmin(normalizedEmail),
    });

    res.status(201).json(buildAuthResponse(user));
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await user.matchPassword(password))) {
      const nextAdminState = isAdmin(user.email);
      if (user.isAdmin !== nextAdminState) {
        user.isAdmin = nextAdminState;
        await user.save();
      }

      res.json(buildAuthResponse(user));
      return;
    }

    res.status(401);
    throw new Error('Invalid email or password');
  })
);

router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const credential = String(req.body.credential || '').trim();
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const oauthClient = getGoogleClient();

    if (!clientId || !oauthClient) {
      res.status(500);
      throw new Error('Google sign-in is not configured on the server');
    }

    if (!credential) {
      res.status(400);
      throw new Error('Google credential is required');
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const normalizedEmail = String(payload?.email || '').trim().toLowerCase();

    if (!payload?.sub || !normalizedEmail || !payload.email_verified) {
      res.status(401);
      throw new Error('Google account could not be verified');
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: normalizedEmail }],
    });

    if (!user) {
      user = await User.create({
        name: String(payload.name || normalizedEmail.split('@')[0]).trim(),
        email: normalizedEmail,
        googleId: payload.sub,
        avatarUrl: payload.picture || undefined,
        profileImage: payload.picture || undefined,
        isAdmin: isAdmin(normalizedEmail),
      });
    } else {
      let changed = false;
      const nextAdminState = isAdmin(normalizedEmail);

      if (!user.googleId) {
        user.googleId = payload.sub;
        changed = true;
      }

      if (payload.picture && user.avatarUrl !== payload.picture) {
        user.avatarUrl = payload.picture;
        changed = true;
      }

      if (payload.picture && user.profileImage !== payload.picture) {
        user.profileImage = payload.picture;
        changed = true;
      }

      if (!user.name?.trim() && payload.name) {
        user.name = payload.name.trim();
        changed = true;
      }

      if (user.isAdmin !== nextAdminState) {
        user.isAdmin = nextAdminState;
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    res.json(buildAuthResponse(user));
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      res.status(400);
      throw new Error('Email is required');
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.json({
        message: 'If an account exists for that email, a reset link has been prepared.',
      });
      return;
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/account?mode=reset&token=${rawResetToken}`;

    res.json({
      message: 'If an account exists for that email, a reset link has been prepared.',
      ...(process.env.NODE_ENV === 'production'
        ? {}
        : {
            resetToken: rawResetToken,
            resetUrl,
            expiresInMinutes: 15,
          }),
    });
  })
);

router.post(
  '/reset-password/:token',
  asyncHandler(async (req, res) => {
    const rawToken = String(req.params.token || '');
    const password = String(req.body.password || '');

    if (!rawToken || !password) {
      res.status(400);
      throw new Error('Reset token and new password are required');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Reset token is invalid or has expired');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.isAdmin = isAdmin(user.email);
    await user.save();

    res.json({
      message: 'Password updated successfully',
      ...buildAuthResponse(user),
    });
  })
);

router.get(
  '/profile',
  protect,
  asyncHandler(async (req, res) => {
    res.json((req as AuthenticatedRequest).user);
  })
);

export default router;
