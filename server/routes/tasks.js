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
        SELECT t.*, c.name as customer_name 
        FROM tasks t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        ORDER BY t.stage, t.position, t.created_at
      `);
    } else {
      [rows] = await pool.execute(`
        SELECT t.*, c.name as customer_name 
        FROM tasks t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.customer_id IN (SELECT customer_id FROM user_customers WHERE user_id = ?)
        ORDER BY t.stage, t.position, t.created_at
      `, [req.user.id]);
    }
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении задач' });
  }
});

router.post('/', async (req, res) => {
  const { title, stage, customer_id, position, due_date, cost, hours } = req.body;
  
  if (!title || !customer_id) {
    return res.status(400).json({ error: 'Укажите название и заказчика' });
  }

  if (req.user.role !== 'admin') {
    const [rows] = await pool.execute(
      'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?',
      [req.user.id, customer_id]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Нет доступа к этому заказчику' });
    }
  }

  const stageOrder = stage || 'todo';
  const [posRows] = await pool.execute(
    'SELECT COALESCE(MAX(position), 0) + 1 as pos FROM tasks WHERE stage = ?',
    [stageOrder]
  );
  const newPosition = position !== undefined ? position : posRows[0].pos;

  const id = 't' + Date.now();
  
  try {
    await pool.execute(
      'INSERT INTO tasks (id, title, stage, customer_id, user_id, position, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, stageOrder, customer_id, req.user.id, newPosition, due_date || null, cost || 0, hours || 0]
    );
    
    const [rows] = await pool.execute(
      'SELECT t.*, c.name as customer_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = ?',
      [id]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, stage, customer_id, position, due_date, cost, hours } = req.body;
  
  try {
    const [taskRows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const task = taskRows[0];
    
    if (!task) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    if (req.user.role !== 'admin') {
      const [accessRows] = await pool.execute(
        'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?',
        [req.user.id, task.customer_id]
      );
      
      if (accessRows.length === 0) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
    }

    const newStage = stage !== undefined ? stage : task.stage;
    const newPosition = position !== undefined ? position : task.position;

    await pool.execute(
      'UPDATE tasks SET title = ?, stage = ?, customer_id = ?, position = ?, due_date = ?, cost = ?, hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title || task.title, newStage, customer_id || task.customer_id, newPosition, due_date !== undefined ? due_date : task.due_date, cost !== undefined ? cost : task.cost, hours !== undefined ? hours : task.hours, id]
    );
    
    if (newStage !== task.stage || position !== undefined) {
      await pool.execute(
        'UPDATE tasks SET position = position + 1 WHERE stage = ? AND position >= ? AND id != ?',
        [newStage, newPosition, id]
      );
    }
    
    const [rows] = await pool.execute(
      'SELECT t.*, c.name as customer_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении' });
  }
});

router.post('/reorder', async (req, res) => {
  const { taskId, overId, stage } = req.body;
  
  if (!taskId || !stage) {
    return res.status(400).json({ error: 'Укажите taskId и stage' });
  }
  
  try {
    const [taskRows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    const task = taskRows[0];
    
    if (!task) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    if (req.user.role !== 'admin') {
      const [accessRows] = await pool.execute(
        'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?',
        [req.user.id, task.customer_id]
      );
      if (accessRows.length === 0) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
    }

    let newPosition;
    
    if (overId) {
      const [overRows] = await pool.execute('SELECT position FROM tasks WHERE id = ?', [overId]);
      newPosition = overRows[0] ? overRows[0].position : 1;
    } else {
      const [maxRows] = await pool.execute(
        'SELECT COALESCE(MAX(position), 0) as pos FROM tasks WHERE stage = ?',
        [stage]
      );
      newPosition = (maxRows[0]?.pos || 0) + 1;
    }

    const oldStage = task.stage;
    const oldPos = task.position;

    if (oldStage === stage) {
      if (oldPos !== newPosition) {
        if (oldPos < newPosition) {
          await pool.execute(
            'UPDATE tasks SET position = position - 1 WHERE stage = ? AND position > ? AND position <= ?',
            [stage, oldPos, newPosition]
          );
        } else {
          await pool.execute(
            'UPDATE tasks SET position = position + 1 WHERE stage = ? AND position >= ? AND position < ?',
            [stage, newPosition, oldPos]
          );
        }
      }
    } else {
      await pool.execute(
        'UPDATE tasks SET position = position + 1 WHERE stage = ? AND position >= ?',
        [stage, newPosition]
      );
    }

    await pool.execute(
      'UPDATE tasks SET stage = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [stage, newPosition, taskId]
    );

    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.execute(`
        SELECT t.*, c.name as customer_name 
        FROM tasks t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        ORDER BY t.stage, t.position, t.created_at
      `);
    } else {
      [rows] = await pool.execute(`
        SELECT t.*, c.name as customer_name 
        FROM tasks t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.customer_id IN (SELECT customer_id FROM user_customers WHERE user_id = ?)
        ORDER BY t.stage, t.position, t.created_at
      `, [req.user.id]);
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при перемещении' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [taskRows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const task = taskRows[0];
    
    if (!task) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    if (req.user.role !== 'admin') {
      const [accessRows] = await pool.execute(
        'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?',
        [req.user.id, task.customer_id]
      );
      
      if (accessRows.length === 0) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
    }

    await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
    await pool.execute(
      'UPDATE tasks SET position = position - 1 WHERE stage = ? AND position > ?',
      [task.stage, task.position]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;