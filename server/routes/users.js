import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, username, role, allowed_stages, created_at FROM users ORDER BY created_at DESC');
    
    const usersWithCustomers = await Promise.all(users.map(async (user) => {
      const [customerRows] = await pool.execute(
        'SELECT customer_id FROM user_customers WHERE user_id = ?',
        [user.id]
      );
      return { 
        ...user,
        allowedStages: user.allowed_stages == null ? null : user.allowed_stages.split(',').filter(Boolean),
        customerIds: customerRows.map(r => r.customer_id) 
      };
    }));
    
    res.json(usersWithCustomers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

router.post('/', async (req, res) => {
  const { username, password, role, customerIds, allowedStages } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }

  const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
  }

  const id = 'u' + Date.now();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const stagesCsv = Array.isArray(allowedStages) ? allowedStages.join(',') : null;
  
  try {
    await pool.execute(
      'INSERT INTO users (id, username, password, role, allowed_stages) VALUES (?, ?, ?, ?, ?)',
      [id, username, hashedPassword, role || 'user', stagesCsv]
    );
    
    if (customerIds && customerIds.length > 0) {
      for (const cid of customerIds) {
        await pool.execute(
          'INSERT INTO user_customers (user_id, customer_id) VALUES (?, ?)',
          [id, cid]
        );
      }
    }
    
    const [rows] = await pool.execute(
      'SELECT id, username, role, allowed_stages, created_at FROM users WHERE id = ?',
      [id]
    );
    res.status(201).json({
      ...rows[0],
      allowedStages: rows[0].allowed_stages == null ? null : rows[0].allowed_stages.split(',').filter(Boolean),
      customerIds: customerIds || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании пользователя' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role, customerIds, allowedStages } = req.body;
  
  const [userRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  const user = userRows[0];
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (user.role === 'admin' && role !== 'admin') {
    const [adminRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    if (adminRows[0].count <= 1) {
      return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
    }
  }

  const stagesCsv = Array.isArray(allowedStages) ? allowedStages.join(',') : null;

  try {
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.execute(
        'UPDATE users SET username = ?, password = ?, role = ?, allowed_stages = ? WHERE id = ?',
        [username || user.username, hashedPassword, role || user.role, stagesCsv, id]
      );
    } else {
      await pool.execute(
        'UPDATE users SET username = ?, role = ?, allowed_stages = ? WHERE id = ?',
        [username || user.username, role || user.role, stagesCsv, id]
      );
    }

    await pool.execute('DELETE FROM user_customers WHERE user_id = ?', [id]);
    if (customerIds && customerIds.length > 0) {
      for (const cid of customerIds) {
        await pool.execute(
          'INSERT INTO user_customers (user_id, customer_id) VALUES (?, ?)',
          [id, cid]
        );
      }
    }
    
    const [rows] = await pool.execute(
      'SELECT id, username, role, allowed_stages, created_at FROM users WHERE id = ?',
      [id]
    );
    res.json({
      ...rows[0],
      allowedStages: rows[0].allowed_stages == null ? null : rows[0].allowed_stages.split(',').filter(Boolean),
      customerIds: customerIds || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  const [userRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  const user = userRows[0];
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (user.role === 'admin') {
    const [adminRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    if (adminRows[0].count <= 1) {
      return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
    }
  }

  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;