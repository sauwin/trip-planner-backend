import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { globalRateLimit } from './middleware/rateLimit.middleware';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.middleware';

import destinationsRouter from './routes/destinations.routes';
import authRouter from './routes/auth.routes';
import metaRouter from './routes/meta.routes';
import preferencesRouter from './routes/preferences.routes';
import recommendationRouter from './routes/recommendation.routes';
import interactionsRouter from './routes/interactions.routes';
import tripsRouter from './routes/trips.routes';

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use('/api', globalRateLimit);

app.use('/api/auth', authRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api', metaRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/trips', tripsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});