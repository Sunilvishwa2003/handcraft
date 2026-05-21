import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import Product from '../models/Product';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const CLOUDINARY_FOLDER = 'products';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const resolveLocalUploadPath = (imagePath: string) => {
  const normalized = imagePath.replace(/\\/g, '/').trim();

  if (!normalized.startsWith('/uploads/')) {
    return null;
  }

  return path.resolve(process.cwd(), 'uploads', path.basename(normalized));
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const uploadImageToCloudinary = async (filePath: string) => {
  const upload = await cloudinary.uploader.upload(filePath, {
    folder: CLOUDINARY_FOLDER,
    resource_type: 'image',
  });

  return upload.secure_url;
};

const migrateProductImages = async (product: InstanceType<typeof Product>) => {
  const oldImages = [...product.images];
  const nextImages = [...oldImages];
  const missingFiles: string[] = [];
  let migratedImages = 0;

  for (let index = 0; index < nextImages.length; index += 1) {
    const imagePath = String(nextImages[index] || '').trim();

    if (!imagePath || isHttpUrl(imagePath)) {
      continue;
    }

    const localFilePath = resolveLocalUploadPath(imagePath);
    if (!localFilePath) {
      continue;
    }

    if (!(await fileExists(localFilePath))) {
      missingFiles.push(imagePath);
      continue;
    }

    try {
      nextImages[index] = await uploadImageToCloudinary(localFilePath);
      migratedImages += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      console.error(`Failed to migrate image for "${product.name}": ${imagePath} (${message})`);
    }
  }

  console.log(`Product: ${product.name}`);
  console.log('Old images:', JSON.stringify(oldImages));
  console.log('New images:', JSON.stringify(nextImages));

  if (migratedImages > 0) {
    product.images = nextImages;
    product.markModified('images');
    await product.save();
    console.log('Product saved successfully');
  } else {
    console.log('No new local uploads were migrated for this product.');
  }

  console.log(`Migrated images: ${migratedImages}`);
  console.log(`Missing files: ${missingFiles.length}${missingFiles.length ? ` (${missingFiles.join(', ')})` : ''}`);
};

const main = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is required to run the image migration.');
  }

  await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${mongoose.connection.host}`);

  const products = await Product.find();

  for (const product of products) {
    try {
      await migrateProductImages(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown migration error';
      console.error(`Failed to process product "${product.name}": ${message}`);
    }
  }
};

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Image migration failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  });
