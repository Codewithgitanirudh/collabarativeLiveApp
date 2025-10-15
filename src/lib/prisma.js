import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'], // Optional: Add logging for debugging
});

export default prisma;