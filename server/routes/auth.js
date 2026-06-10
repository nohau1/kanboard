import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при авторизации' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute('SELECT id, username, role FROM users WHERE id = ?', [decoded.userId]);
    const user = rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const [customerRows] = await pool.execute(
      'SELECT customer_id FROM user_customers WHERE user_id = ?',
      [user.id]
    );
    const customerIds = customerRows.map(r => r.customer_id);

    res.json({ ...user, customerIds });
  } catch (err) {
    res.status(403).json({ error: 'Недействительный токен' });
  }
});

export default router;