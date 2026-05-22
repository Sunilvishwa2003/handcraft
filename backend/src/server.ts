import path from 'path';
import dotenv from 'dotenv';

// Load environment variables as early as possible so imported modules can rely on them
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';
import cartRoutes from './routes/cartRoutes';
import notificationRoutes from './routes/notificationRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import productRoutes from './routes/productRoutes';
import wishlistRoutes from './routes/wishlistRoutes';

import userRoutes from './routes/userRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import customOrdersRoutes from './routes/customOrdersRoutes';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import { setupSocket } from './services/realtimeService';

// Environment validation
const requiredEnvs = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLIENT_URL',
];

const missing = requiredEnvs.filter((name) => !process.env[name]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  console.error(`Loaded ${requiredEnvs.length - missing.length}/${requiredEnvs.length} required env vars.`);
} else {
  console.log(`All required environment variables present (${requiredEnvs.length}).`);
}

connectDB();

const app = express();
const httpServer = createServer(app);

const configuredOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
].filter(Boolean) as string[];

const isPrivateNetworkOrigin = (origin: string) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      /^10(?:\.\d{1,3}){3}$/.test(hostname) ||
      /^192\.168(?:\.\d{1,3}){2}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(hostname)
    );
  } catch {
    return false;
  }
};

const isAllowedOrigin = (origin?: string) => {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" && isPrivateNetworkOrigin(origin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api/users', userRoutes);
app.use('/api/custom-orders', customOrdersRoutes);
app.use('/api/whatsapp', whatsappRoutes);

setupSocket(io);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5001;

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Another backend instance is probably still running. Stop the old process or change PORT in backend/.env.`,
    );
    process.exit(1);
  }

  console.error('Server failed to start:', error);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
