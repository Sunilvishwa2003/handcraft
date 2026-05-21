import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';

const tempUploadDir = path.join(os.tmpdir(), 'mahabscrafto-uploads');
const allowedAssetExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.glb', '.gltf']);

if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  // Store incoming multipart files in a temp folder until Cloudinary returns secure URLs.
  destination: (_req: unknown, _file: unknown, callback: (error: Error | null, destination: string) => void) => {
    callback(null, tempUploadDir);
  },
  filename: (_req: unknown, file: { originalname: string }, callback: (error: Error | null, filename: string) => void) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, extension)
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    callback(null, `${safeName || 'upload'}-${Date.now()}${extension}`);
  },
});

// Re-export the temp disk storage so routes with stricter rules can share the same lifecycle.
export const tempUploadStorage = storage;

export const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req: unknown, file: { originalname: string; mimetype: string }, callback: (error: Error | null, acceptFile?: boolean) => void) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const normalizedMimeType = file.mimetype.toLowerCase();
    const isImageAsset = ['.jpg', '.jpeg', '.png', '.webp'].includes(extension) && normalizedMimeType.startsWith('image/');
    const isModelAsset = ['.glb', '.gltf'].includes(extension);
    const isSupportedAsset = allowedAssetExtensions.has(extension) && (isImageAsset || isModelAsset);

    if (!isSupportedAsset) {
      callback(new Error('Only JPG, JPEG, PNG, WEBP, GLB, and GLTF files are allowed.'));
      return;
    }

    callback(null, true);
  },
});

export default upload;
