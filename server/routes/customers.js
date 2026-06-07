import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
  let customers;
  
  if (req.user.role === 'admin') {
    customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  } else {
    customers = db.prepare(`
      SELECT c.* FROM customers c 
      INNER JOIN user_customers uc ON c.id = uc.customer_id 
      WHERE uc.user_id = ? 
      ORDER BY c.name
    `).all(req.user.id);
  }
  
  res.json(customers);
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Укажите название' });
  }

  const id = 'c' + Date.now();
  
  try {
    db.prepare('INSERT INTO customers (id, name) VALUES (?, ?)').run(id, name);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при создании' });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  try {
    db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name, id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при обновлении' });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;