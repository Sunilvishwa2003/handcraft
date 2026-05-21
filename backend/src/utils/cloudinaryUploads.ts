import fs from 'fs/promises';
import path from 'path';
import cloudinary from '../config/cloudinary';

export type LocalUploadFile = {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export type UploadedCloudinaryFile = {
  originalName: string;
  url: string;
  mimetype: string;
  size: number;
  publicId: string;
};

export type FailedCloudinaryFile = {
  originalName: string;
  tempFilePath: string;
  error: string;
};

type UploadOptions = {
  folder?: string;
  context?: string;
};

const isImageAsset = (file: LocalUploadFile) => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase());

const getUploadOptionsForFile = (file: LocalUploadFile, folder: string) => {
  if (isImageAsset(file)) {
    return {
      folder,
      resource_type: 'image' as const,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    };
  }

  return {
    folder,
    resource_type: 'raw' as const,
  };
};

const cleanupTempFile = async (filePath: string) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    if (err.code !== 'ENOENT') {
      console.error('Failed to delete temporary upload file', {
        tempFilePath: filePath,
        error: err.message,
      });
    }
  }
};

export const uploadFilesToCloudinary = async (
  files: LocalUploadFile[],
  options: UploadOptions = {},
) => {
  const folder = options.folder || 'products';
  const context = options.context || 'cloudinary-upload';
  const uploaded: UploadedCloudinaryFile[] = [];
  const failed: FailedCloudinaryFile[] = [];

  for (const file of files) {
    try {
      // Cloudinary returns the permanent CDN URL in secure_url, which is what we persist to MongoDB.
      const result = await cloudinary.uploader.upload(file.path, getUploadOptionsForFile(file, folder));

      if (!result.secure_url) {
        throw new Error('Cloudinary upload succeeded without a secure_url.');
      }

      uploaded.push({
        originalName: file.originalname,
        url: result.secure_url,
        mimetype: file.mimetype,
        size: file.size,
        publicId: result.public_id,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : JSON.stringify(error);
      const errorCode = error && typeof error === 'object' && 'http_code' in error ? (error as { http_code?: number }).http_code : undefined;

      console.error('Cloudinary upload failed', {
        context,
        originalName: file.originalname,
        tempFilePath: file.path,
        mimetype: file.mimetype,
        size: file.size,
        error: message,
        errorCode,
      });

      failed.push({
        originalName: file.originalname,
        tempFilePath: file.path,
        error: `${message}${errorCode ? ` (http_code=${errorCode})` : ''}`,
      });
    } finally {
      // Temp files are always cleaned up, even when Cloudinary rejects the upload.
      await cleanupTempFile(file.path);
    }
  }

  return { uploaded, failed };
};

export const isCloudinaryImageUpload = (file: LocalUploadFile) => isImageAsset(file);
