import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cart from '../models/Cart';
import Order from '../models/Order';
import Product from '../models/Product';
import {
  buildProductImageArray,
  getProductImageUrl,
  getProductPrimaryImage,
  PRODUCT_IMAGE_PLACEHOLDER,
  type ProductImageCarrier,
} from '../utils/productImage';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const APPLY_CHANGES = process.argv.includes('--apply');

const arraysMatch = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const main = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is required to run the image repair script.');
  }

  await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  console.log(APPLY_CHANGES ? 'Running in APPLY mode.' : 'Running in DRY-RUN mode. Pass --apply to persist changes.');

  const rawProducts = await Product.collection
    .find({}, { projection: { _id: 1, name: 1, images: 1, image: 1, thumbnail: 1, imageUrl: 1 } })
    .toArray();

  let repairedProducts = 0;
  for (const rawProduct of rawProducts) {
    const currentImages = Array.isArray(rawProduct.images)
      ? rawProduct.images.map((image) => getProductImageUrl(image)).filter(Boolean)
      : [];
    const nextImages = buildProductImageArray(rawProduct as unknown as ProductImageCarrier);

    if (arraysMatch(currentImages, nextImages)) {
      continue;
    }

    repairedProducts += 1;
    console.log(`[product] ${rawProduct.name}: ${JSON.stringify(currentImages)} -> ${JSON.stringify(nextImages)}`);

    if (APPLY_CHANGES) {
      await Product.findByIdAndUpdate(rawProduct._id, { images: nextImages }, { runValidators: true });
    }
  }

  const carts = await Cart.find().populate('items.product', 'images image thumbnail imageUrl');
  let repairedCarts = 0;

  for (const cart of carts) {
    let changed = false;

    cart.items.forEach((item: any) => {
      const currentImage = String(item.image || '').trim();
      if (currentImage) {
        return;
      }

      item.image = getProductPrimaryImage(item.product, PRODUCT_IMAGE_PLACEHOLDER);
      changed = true;
    });

    if (!changed) {
      continue;
    }

    repairedCarts += 1;
    console.log(`[cart] ${cart._id}: repaired missing item images`);

    if (APPLY_CHANGES) {
      await cart.save();
    }
  }

  const orders = await Order.find().populate('orderItems.product', 'images image thumbnail imageUrl');
  let repairedOrders = 0;

  for (const order of orders) {
    let changed = false;

    order.orderItems.forEach((item: any) => {
      const currentImage = String(item.image || '').trim();
      if (currentImage) {
        return;
      }

      item.image = getProductPrimaryImage(item.product, PRODUCT_IMAGE_PLACEHOLDER);
      changed = true;
    });

    if (!changed) {
      continue;
    }

    repairedOrders += 1;
    console.log(`[order] ${order._id}: repaired missing item images`);

    if (APPLY_CHANGES) {
      await order.save();
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY_CHANGES ? 'apply' : 'dry-run',
        repairedProducts,
        repairedCarts,
        repairedOrders,
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Image repair failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  });
