import { Server, Socket } from 'socket.io';

let ioInstance: Server | null = null;

export const setupSocket = (io: Server) => {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    socket.on('join:user', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('join:order', (orderId: string) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('support:message', (payload: { userId?: string; message?: string }) => {
      socket.emit('support:reply', {
        message: `I can help with products, carts, coupons, and order tracking. You said: ${payload.message || ''}`,
        createdAt: new Date(),
      });
    });
  });
};

export const emitToUser = (userId: string, event: string, payload: unknown) => {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
};

export const emitOrderUpdate = (orderId: string, userId: string, payload: unknown) => {
  ioInstance?.to(`order:${orderId}`).emit('order:update', payload);
  ioInstance?.to(`user:${userId}`).emit('order:update', payload);
};

export const emitOffer = (payload: unknown) => {
  ioInstance?.emit('offer:update', payload);
};
