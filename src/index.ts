import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { requireAuth } from './middleware/auth.middleware';

import destinationsRouter from './routes/destinations.routes';
import authRouter from './routes/auth.routes';
import metaRouter from './routes/meta.routes';
import preferencesRouter from './routes/preferences.routes';
import recommendationRouter from './routes/recommendation.routes';
import interactionsRouter from './routes/interactions.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api', metaRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/interactions', interactionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});