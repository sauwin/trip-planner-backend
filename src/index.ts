import 'dotenv/config';
import app from './app';
import { bootstrapSuperAdmin } from './services/auth.service';

const PORT = process.env.PORT || 3000;

async function startServer() {
  await bootstrapSuperAdmin();
  app.listen(PORT, () => {
    console.log(`Server: http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exitCode = 1;
});