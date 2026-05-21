import mongoose from 'mongoose';
import User from './src/models/User';

mongoose.connect('mongodb://localhost:27017/stone-handcrafts').then(async () => {
  const users = await User.find({});
  console.log('Users:', users.map(u => ({ email: u.email, isAdmin: u.isAdmin })));
  process.exit();
}).catch(console.error);
