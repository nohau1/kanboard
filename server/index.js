import './env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import customersRoutes from './routes/customers.js';
import usersRoutes from './routes/users.js';
import attachmentsRoutes from './routes/attachments.js';
import invoicesRoutes from './routes/invoices.js';
import dbRoutes from './routes/db.js';

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
app.use('/api/invoices', invoicesRoutes);
app.use('/api/db', dbRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});