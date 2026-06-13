import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import customersRoutes from './routes/customers.js';
import usersRoutes from './routes/users.js';
import attachmentsRoutes from './routes/attachments.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attachments', attachmentsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});