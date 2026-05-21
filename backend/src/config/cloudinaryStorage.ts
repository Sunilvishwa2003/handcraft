import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary';

const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];

const createPublicId = (originalName: string) => {
  const extension = path.extname(originalName);
  const safeName = path
    .basename(originalName, extension)
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${safeName || 'image'}-${Date.now()}`;
};

export const createCloudinaryStorage = (folder = 'products') =>
  new CloudinaryStorage({
    cloudinary,
    params: (_req, file) => ({
      folder,
      resource_type: 'image',
      allowed_formats: allowedFormats,
      public_id: createPublicId(file.originalname),
    }),
  });

const storage = createCloudinaryStorage();

export { allowedFormats, storage };
export default storage;
