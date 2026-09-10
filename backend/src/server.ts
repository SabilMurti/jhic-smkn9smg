import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myskanilan_central';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health & Info Endpoint
app.get('/', (_req, res) => {
  res.json({
    app: 'MySkanilan Portal System Central Data Gateway',
    version: '1.0.0',
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'connected (MongoDB Native)' : 'connecting/disconnected',
    timestamp: new Date()
  });
});

// Mount Central API Routes
app.use('/api/v1', apiRoutes);

async function startServer() {
  try {
    console.log(`🔌 Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB Native Database: myskanilan_central');
  } catch (error) {
    console.warn('⚠️ Warning: MongoDB native connection failed (database may still be starting):', (error as Error).message);
    console.warn('⚠️ Server will still listen to accept requests.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 MySkanilan Central Data Gateway running on http://127.0.0.1:${PORT}`);
  });
}

startServer();
