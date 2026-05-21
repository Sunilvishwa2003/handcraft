import mongoose from 'mongoose';
import Product from './src/models/Product';

const categoryMapping: Record<string, string> = {
  'Stone': 'stone',
  'Stone Name Board': 'stone-name-board',
  'Metal': 'metal',
  'Wood': 'wood',
  'Home Decor': 'home-decor',
  'Statues': 'statues',
  'Pooja Items': 'pooja-items',
  'Garden Decor': 'garden-decor',
  // Add more mappings as needed
};

mongoose.connect('mongodb://localhost:27017/stone-handcrafts').then(async () => {
  console.log('Connected to database');

  const products = await Product.find({});
  let updatedCount = 0;

  for (const product of products) {
    const newSlug = categoryMapping[product.category];
    if (newSlug && newSlug !== product.category) {
      product.category = newSlug;
      await product.save();
      updatedCount++;
      console.log(`Updated ${product.name}: ${product.category} -> ${newSlug}`);
    }
  }

  console.log(`Migration completed. Updated ${updatedCount} products.`);
  process.exit();
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});