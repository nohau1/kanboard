import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
  
  const usersWithCustomers = users.map(user => {
    const customerIds = db.prepare('SELECT customer_id FROM user_customers WHERE user_id = ?')
      .all(user.id)
      .map(r => r.customer_id);
    return { ...user, customerIds };
  });
  
  res.json(usersWithCustomers);
});

router.post('/', (req, res) => {
  const { username, password, role, customerIds } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
  }

  const id = 'u' + Date.now();
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)')
      .run(id, username, hashedPassword, role || 'user');
    
    if (customerIds && customerIds.length > 0) {
      const insertUC = db.prepare('INSERT INTO user_customers (user_id, customer_id) VALUES (?, ?)');
      customerIds.forEach(cid => insertUC.run(id, cid));
    }
    
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ ...user, customerIds: customerIds || [] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при создании пользователя' });
  }
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, role, customerIds } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (user.role === 'admin' && role !== 'admin') {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
    }
  }

  try {
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?')
        .run(username || user.username, hashedPassword, role || user.role, id);
    } else {
      db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?')
        .run(username || user.username, role || user.role, id);
    }

    db.prepare('DELETE FROM user_customers WHERE user_id = ?').run(id);
    if (customerIds && customerIds.length > 0) {
      const insertUC = db.prepare('INSERT INTO user_customers (user_id, customer_id) VALUES (?, ?)');
      customerIds.forEach(cid => insertUC.run(id, cid));
    }
    
    const updated = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id);
    res.json({ ...updated, customerIds: customerIds || [] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при обновлении' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (user.role === 'admin') {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
    }
  }

  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;