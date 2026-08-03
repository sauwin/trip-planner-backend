import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import destinationsRouter from './routes/destinations.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/destinations', destinationsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server beží na http://localhost:${PORT}`);
});