import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { UPLOADS_DIR } from './middleware/upload.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'smartbiz-api' }));

// Uploaded business cover photos
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
