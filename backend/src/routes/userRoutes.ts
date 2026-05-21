import express from 'express';
import multer from 'multer';

import Notification from '../models/Notification';
import Order from '../models/Order';
import User from '../models/User';
import { protect } from '../middleware/authMiddleware';
import { tempUploadStorage } from '../middleware/uploadMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/http';
import { uploadFilesToCloudinary, type LocalUploadFile } from '../utils/cloudinaryUploads';

const router = express.Router();

// Profile images use the same temp-file pipeline as product images, but remain image-only.
const profileImageUpload = multer({
  storage: tempUploadStorage,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req: unknown, file: { originalname: string; mimetype: string }, callback: (error: Error | null, acceptFile?: boolean) => void) => {
    const isSupportedImage = ['.jpg', '.jpeg', '.png', '.webp'].some((extension) => file.originalname.toLowerCase().endsWith(extension))
      && file.mimetype.toLowerCase().startsWith('image/');

    if (!isSupportedImage) {
      callback(new Error('Only JPG, JPEG, PNG, and WEBP profile images are allowed.'));
      return;
    }

    callback(null, true);
  },
});

const PHONE_PATTERN = /^[0-9+\-() ]{7,20}$/;
const PINCODE_PATTERN = /^[A-Za-z0-9 -]{4,12}$/;

const sanitizeText = (value: unknown) => String(value || '').trim();

const ensureValidProfile = (body: Record<string, unknown>) => {
  const name = sanitizeText(body.name);
  const phone = sanitizeText(body.phone);

  if (!name || name.length < 2 || name.length > 80) {
    throw new Error('Name must be between 2 and 80 characters');
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    throw new Error('Enter a valid phone number');
  }

  return { name, phone };
};

const ensureValidAddress = (body: Record<string, unknown>) => {
  const address = {
    fullName: sanitizeText(body.fullName),
    phone: sanitizeText(body.phone),
    street: sanitizeText(body.street),
    city: sanitizeText(body.city),
    state: sanitizeText(body.state),
    pincode: sanitizeText(body.pincode),
    country: sanitizeText(body.country),
  };

  if (!address.fullName || address.fullName.length < 2 || address.fullName.length > 80) {
    throw new Error('Full name must be between 2 and 80 characters');
  }

  if (!PHONE_PATTERN.test(address.phone)) {
    throw new Error('Enter a valid phone number');
  }

  if (!address.street || address.street.length < 5 || address.street.length > 160) {
    throw new Error('Street must be between 5 and 160 characters');
  }

  if (!address.city || address.city.length < 2 || address.city.length > 80) {
    throw new Error('City must be between 2 and 80 characters');
  }

  if (!address.state || address.state.length < 2 || address.state.length > 80) {
    throw new Error('State must be between 2 and 80 characters');
  }

  if (!address.country || address.country.length < 2 || address.country.length > 80) {
    throw new Error('Country must be between 2 and 80 characters');
  }

  if (!PINCODE_PATTERN.test(address.pincode)) {
    throw new Error('Enter a valid pincode');
  }

  return address;
};

const sortAddresses = (addresses: any[]) =>
  [...addresses].sort((first, second) => {
    if (first.isDefault === second.isDefault) {
      return new Date(second.updatedAt || second.createdAt || 0).getTime() - new Date(first.updatedAt || first.createdAt || 0).getTime();
    }

    return first.isDefault ? -1 : 1;
  });

const unreadNotificationQuery = (userId: unknown) => ({
  $or: [{ user: userId }, { user: { $exists: false } }],
  read: false,
}) as any;

const toAddressResponse = (address: any) => ({
  _id: String(address._id),
  fullName: address.fullName,
  phone: address.phone,
  street: address.street,
  city: address.city,
  state: address.state,
  pincode: address.pincode,
  country: address.country,
  isDefault: Boolean(address.isDefault),
  createdAt: address.createdAt,
  updatedAt: address.updatedAt,
});

const mapProfile = (user: any, counts: { orderCount: number; unreadNotificationCount: number }) => ({
  _id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  profileImage: user.profileImage || user.avatarUrl || '',
  avatarUrl: user.avatarUrl || user.profileImage || '',
  joinedDate: user.createdAt,
  createdAt: user.createdAt,
  authProvider: user.googleId ? 'google' : 'credentials',
  isAdmin: Boolean(user.isAdmin),
  counts: {
    addresses: Array.isArray(user.addresses) ? user.addresses.length : 0,
    wishlist: Array.isArray(user.wishlist) ? user.wishlist.length : 0,
    orders: counts.orderCount,
    notifications: counts.unreadNotificationCount,
  },
});

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).user?._id;

    const [user, orderCount, unreadNotificationCount] = await Promise.all([
      User.findById(userId).select('-password').lean(),
      Order.countDocuments({ user: userId }),
      Notification.countDocuments(unreadNotificationQuery(userId)),
    ]);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.json(mapProfile(user, { orderCount, unreadNotificationCount }));
  })
);

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    try {
      const { name, phone } = ensureValidProfile(req.body || {});
      user.name = name;
      user.phone = phone || undefined;
    } catch (error) {
      res.status(400);
      throw error;
    }

    await user.save();

    const [orderCount, unreadNotificationCount] = await Promise.all([
      Order.countDocuments({ user: user._id }),
      Notification.countDocuments(unreadNotificationQuery(user._id)),
    ]);
    res.json(mapProfile(user.toObject(), { orderCount, unreadNotificationCount }));
  })
);

router.post(
  '/me/profile-image',
  protect,
  profileImageUpload.single('image'),
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const file = (req as any).file as LocalUploadFile | undefined;
    if (!file) {
      res.status(400);
      throw new Error('Profile image is required');
    }

    // Persist the permanent Cloudinary secure_url rather than a temporary local path.
    const { uploaded, failed } = await uploadFilesToCloudinary([file], {
      folder: 'profiles',
      context: `profile-image:${String(user._id)}`,
    });

    if (!uploaded.length) {
      console.error('Profile image upload failed', {
        userId: String(user._id),
        failures: failed,
      });
      res.status(502);
      throw new Error('Cloudinary profile image upload failed. Check backend logs for details.');
    }

    user.profileImage = uploaded[0].url.trim();
    await user.save();

    const [orderCount, unreadNotificationCount] = await Promise.all([
      Order.countDocuments({ user: user._id }),
      Notification.countDocuments(unreadNotificationQuery(user._id)),
    ]);

    res.json({
      profile: mapProfile(user.toObject(), { orderCount, unreadNotificationCount }),
      imageUrl: user.profileImage,
    });
  })
);

router.get(
  '/me/addresses',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id).select('addresses');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.json(sortAddresses((user.addresses || []).map(toAddressResponse)));
  })
);

router.post(
  '/me/addresses',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const makeDefault = Boolean(req.body?.isDefault) || user.addresses.length === 0;

    let address;
    try {
      address = ensureValidAddress(req.body || {});
    } catch (error) {
      res.status(400);
      throw error;
    }

    if (makeDefault) {
      user.addresses.forEach((entry) => {
        entry.isDefault = false;
      });
    }

    user.addresses.push({
      ...address,
      isDefault: makeDefault,
    } as any);

    await user.save();
    res.status(201).json(sortAddresses((user.addresses || []).map(toAddressResponse)));
  })
);

router.put(
  '/me/addresses/:addressId',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const addressIndex = user.addresses.findIndex((entry) => String(entry._id) === String(req.params.addressId));
    if (addressIndex === -1) {
      res.status(404);
      throw new Error('Address not found');
    }

    let nextAddress;
    try {
      nextAddress = ensureValidAddress(req.body || {});
    } catch (error) {
      res.status(400);
      throw error;
    }

    const shouldBeDefault = Boolean(req.body?.isDefault);
    if (shouldBeDefault) {
      user.addresses.forEach((entry) => {
        entry.isDefault = false;
      });
    }

    const currentAddress = user.addresses[addressIndex];
    currentAddress.fullName = nextAddress.fullName;
    currentAddress.phone = nextAddress.phone;
    currentAddress.street = nextAddress.street;
    currentAddress.city = nextAddress.city;
    currentAddress.state = nextAddress.state;
    currentAddress.pincode = nextAddress.pincode;
    currentAddress.country = nextAddress.country;
    currentAddress.isDefault = shouldBeDefault ? true : currentAddress.isDefault;

    await user.save();
    res.json(sortAddresses((user.addresses || []).map(toAddressResponse)));
  })
);

router.patch(
  '/me/addresses/:addressId/default',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const addressExists = user.addresses.some((entry) => String(entry._id) === String(req.params.addressId));
    if (!addressExists) {
      res.status(404);
      throw new Error('Address not found');
    }

    user.addresses.forEach((entry) => {
      entry.isDefault = String(entry._id) === String(req.params.addressId);
    });

    await user.save();
    res.json(sortAddresses((user.addresses || []).map(toAddressResponse)));
  })
);

router.delete(
  '/me/addresses/:addressId',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById((req as AuthenticatedRequest).user?._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const addressToDelete = user.addresses.find((entry) => String(entry._id) === String(req.params.addressId));
    if (!addressToDelete) {
      res.status(404);
      throw new Error('Address not found');
    }

    user.addresses = user.addresses.filter((entry) => String(entry._id) !== String(req.params.addressId)) as any;

    if (addressToDelete.isDefault && user.addresses[0]) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json(sortAddresses((user.addresses || []).map(toAddressResponse)));
  })
);

export default router;
;
