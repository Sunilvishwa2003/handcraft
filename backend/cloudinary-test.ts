import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { uploadFilesToCloudinary } from './src/utils/cloudinaryUploads';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const filePath = path.resolve(process.cwd(), 'test-upload.png');
if (!fs.existsSync(filePath)) {
  throw new Error('test-upload.png missing');
}

(async () => {
  const { uploaded, failed } = await uploadFilesToCloudinary([
    {
      path: filePath,
      originalname: 'test-upload.png',
      mimetype: 'image/png',
      size: fs.statSync(filePath).size,
    },
  ]);
  console.log('uploaded', JSON.stringify(uploaded, null, 2));
  console.log('failed', JSON.stringify(failed, null, 2));
})();
