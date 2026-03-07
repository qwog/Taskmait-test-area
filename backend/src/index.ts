import express from 'express';
import cors from 'cors';
import { initDb } from './db/database';
import authRoutes from './routes/auth';
import householdRoutes from './routes/households';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

initDb();
app.listen(PORT, () => console.log(`Choretastic API running on http://localhost:${PORT}`));

export default app;
