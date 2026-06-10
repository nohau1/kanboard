import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    let rows;
    
    if (req.user.role === 'admin') {
      [rows] = await pool.execute('SELECT * FROM customers ORDER BY name');
    } else {
      [rows] = await pool.execute(`
        SELECT c.* FROM customers c 
        INNER JOIN user_customers uc ON c.id = uc.customer_id 
        WHERE uc.user_id = ? 
        ORDER BY c.name
      `, [req.user.id]);
    }
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении заказчиков' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Укажите название' });
  }

  const id = 'c' + Date.now();
  
  try {
    await pool.execute('INSERT INTO customers (id, name) VALUES (?, ?)', [id, name]);
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  try {
    await pool.execute('UPDATE customers SET name = ? WHERE id = ?', [name, id]);
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;