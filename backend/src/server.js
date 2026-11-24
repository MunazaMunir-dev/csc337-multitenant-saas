
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { pool } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import performanceRoutes from './routes/performance.js';
import { notFound, errorHandler } from './middleware/errors.js';

const app = express();

app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Health Check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(503).json({
      status: 'degraded',
      database: 'unavailable'
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', requireAuth, orderRoutes);
app.use('/api/v1/performance', requireAuth, performanceRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Local development only
const port = Number(process.env.PORT || 4000);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

export default app;
