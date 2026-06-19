import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.execute(`
        SELECT i.*, c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ORDER BY i.created_at DESC
      `);
    } else {
      [rows] = await pool.execute(`
        SELECT i.*, c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.customer_id IN (SELECT customer_id FROM user_customers WHERE user_id = ?)
        ORDER BY i.created_at DESC
      `, [req.user.id]);
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении счетов' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Счёт не найден' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении счёта' });
  }
});

router.get('/:id/tasks', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT t.*, c.name as customer_name
      FROM invoice_tasks it
      JOIN tasks t ON it.task_id = t.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE it.invoice_id = ?
      ORDER BY t.stage, t.position
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении задач счёта' });
  }
});

router.post('/', async (req, res) => {
  const { customer_id } = req.body;
  if (!customer_id) {
    return res.status(400).json({ error: 'Укажите заказчика' });
  }

  const id = 'i' + Date.now();
  try {
    await pool.execute(
      'INSERT INTO invoices (id, customer_id) VALUES (?, ?)',
      [id, customer_id]
    );
    const [rows] = await pool.execute(
      'SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании счёта' });
  }
});

router.post('/:id/fill', async (req, res) => {
  const { stages } = req.body;
  if (!stages || stages.length === 0) {
    return res.status(400).json({ error: 'Укажите стадии' });
  }

  try {
    const [invoiceRows] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (invoiceRows.length === 0) return res.status(404).json({ error: 'Счёт не найден' });
    const invoice = invoiceRows[0];

    const placeholders = stages.map(() => '?').join(',');
    const [taskRows] = await pool.execute(`
      SELECT t.*, c.name as customer_name FROM tasks t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.customer_id = ? AND t.stage IN (${placeholders}) AND t.paid = 0
      AND t.id NOT IN (SELECT task_id FROM invoice_tasks WHERE invoice_id = ?)
      ORDER BY t.stage, t.position
    `, [invoice.customer_id, ...stages, req.params.id]);

    res.json(taskRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при заполнении счёта' });
  }
});

router.put('/:id/save', async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds) return res.status(400).json({ error: 'Укажите taskIds' });

  try {
    const [inv] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (inv.length === 0) return res.status(404).json({ error: 'Счёт не найден' });

    await pool.execute('DELETE FROM invoice_tasks WHERE invoice_id = ?', [req.params.id]);

    for (const taskId of taskIds) {
      await pool.execute(
        'INSERT INTO invoice_tasks (invoice_id, task_id) VALUES (?, ?)',
        [req.params.id, taskId]
      );
    }

    const [tasks] = await pool.execute(`
      SELECT t.*, c.name as customer_name
      FROM invoice_tasks it
      JOIN tasks t ON it.task_id = t.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE it.invoice_id = ?
      ORDER BY t.stage, t.position
    `, [req.params.id]);

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при сохранении' });
  }
});

router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM invoice_tasks WHERE invoice_id = ? AND task_id = ?',
      [req.params.id, req.params.taskId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [rows] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Счёт не найден' });

    if (status === 'paid') {
      await pool.execute(
        'UPDATE invoices SET status = ?, paid_at = NOW() WHERE id = ?',
        [status, id]
      );
      await pool.execute(`
        UPDATE tasks SET paid = 1 WHERE id IN (
          SELECT task_id FROM invoice_tasks WHERE invoice_id = ?
        )
      `, [id]);
    } else if (status === 'draft' && invoiceRows[0].status === 'paid') {
      await pool.execute(
        'UPDATE invoices SET status = ?, paid_at = NULL WHERE id = ?',
        [status, id]
      );
      await pool.execute(`
        UPDATE tasks SET paid = 0 WHERE id IN (
          SELECT task_id FROM invoice_tasks WHERE invoice_id = ?
        )
      `, [id]);
    } else {
      await pool.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
    }

    const [updated] = await pool.execute(
      'SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?',
      [id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении счёта' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Счёт не найден' });

    await pool.execute('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении счёта' });
  }
});

export default router;