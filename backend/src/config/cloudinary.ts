import path from 'path';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load env files here as well so standalone scripts can import this module safely.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const getRequiredEnv = (name: 'CLOUDINARY_CLOUD_NAME' | 'CLOUDINARY_API_KEY' | 'CLOUDINARY_API_SECRET') => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to configure Cloudinary uploads.`);
  }

  return value;
};

cloudinary.config({
  cloud_name: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
  api_key: getRequiredEnv('CLOUDINARY_API_KEY'),
  api_secret: getRequiredEnv('CLOUDINARY_API_SECRET'),
  secure: true,
});

export default cloudinary;
