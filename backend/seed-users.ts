import mongoose from 'mongoose';
import User from './src/models/User';

mongoose.connect('mongodb://localhost:27017/stone-handcrafts').then(async () => {
  // Clear existing to avoid duplicate key errors if any exist somehow
  await User.deleteMany({});

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    isAdmin: true
  });

  const user = await User.create({
    name: 'Aarav Kumar',
    email: 'aarav@example.com',
    password: 'password123',
    isAdmin: false
  });

  console.log('Successfully seeded users:');
  console.log(`Admin: ${admin.email} / password123`);
  console.log(`User:  ${user.email}  / password123`);

  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
