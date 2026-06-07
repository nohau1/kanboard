import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
  let tasks;
  
  if (req.user.role === 'admin') {
    tasks = db.prepare(`
      SELECT t.*, c.name as customer_name 
      FROM tasks t 
      LEFT JOIN customers c ON t.customer_id = c.id 
      ORDER BY t.stage, t.position, t.created_at
    `).all();
  } else {
    tasks = db.prepare(`
      SELECT t.*, c.name as customer_name 
      FROM tasks t 
      LEFT JOIN customers c ON t.customer_id = c.id 
      WHERE t.customer_id IN (SELECT customer_id FROM user_customers WHERE user_id = ?)
      ORDER BY t.stage, t.position, t.created_at
    `).all(req.user.id);
  }
  
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { title, stage, customer_id, position } = req.body;
  
  if (!title || !customer_id) {
    return res.status(400).json({ error: 'Укажите название и заказчика' });
  }

  if (req.user.role !== 'admin') {
    const hasAccess = db.prepare(
      'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?'
    ).get(req.user.id, customer_id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Нет доступа к этому заказчику' });
    }
  }

  const stageOrder = stage || 'todo';
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 as pos FROM tasks WHERE stage = ?').get(stageOrder);
  const newPosition = position !== undefined ? position : maxPos.pos;

  const id = 't' + Date.now();
  const stmt = db.prepare('INSERT INTO tasks (id, title, stage, customer_id, user_id, position) VALUES (?, ?, ?, ?, ?, ?)');
  
  try {
    stmt.run(id, title, stageOrder, customer_id, req.user.id, newPosition);
    const task = db.prepare('SELECT t.*, c.name as customer_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = ?').get(id);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, stage, customer_id, position } = req.body;
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }

  if (req.user.role !== 'admin') {
    const hasAccess = db.prepare(
      'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?'
    ).get(req.user.id, task.customer_id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
  }

  const newStage = stage !== undefined ? stage : task.stage;
  const newPosition = position !== undefined ? position : task.position;

  const stmt = db.prepare('UPDATE tasks SET title = ?, stage = ?, customer_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  
  try {
    stmt.run(title || task.title, newStage, customer_id || task.customer_id, newPosition, id);
    
    if (newStage !== task.stage || position !== undefined) {
      db.prepare('UPDATE tasks SET position = position + 1 WHERE stage = ? AND position >= ? AND id != ?')
        .run(newStage, newPosition, id);
    }
    
    const updated = db.prepare('SELECT t.*, c.name as customer_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при обновлении' });
  }
});

router.post('/reorder', (req, res) => {
  const { taskId, overId, stage } = req.body;
  
  if (!taskId || !stage) {
    return res.status(400).json({ error: 'Укажите taskId и stage' });
  }
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }

  if (req.user.role !== 'admin') {
    const hasAccess = db.prepare('SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?')
      .get(req.user.id, task.customer_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
  }

try {
    let newPosition;
    
    if (overId) {
      const overTask = db.prepare('SELECT position FROM tasks WHERE id = ?').get(overId);
      newPosition = overTask ? overTask.position : 1;
    } else {
      const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) as pos FROM tasks WHERE stage = ?').get(stage);
      newPosition = (maxPos?.pos || 0) + 1;
    }

    const oldStage = task.stage;
    const oldPos = task.position;

    if (oldStage === stage) {
      if (oldPos === newPosition) {
        return res.json(req.user.role === 'admin' 
          ? db.prepare('SELECT t.*, c.name as customer_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id ORDER BY t.stage, t.position, t.created_at').all()
          : db.prepare('SELECT t.*, c.name as customer_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.customer_id IN (SELECT customer_id FROM user_customers WHERE user_id = ?) ORDER BY t.stage, t.position, t.created_at').all(req.user.id));
      }
      
      if (oldPos < newPosition) {
        db.prepare('UPDATE tasks SET position = position - 1 WHERE stage = ? AND position > ? AND position <= ?').run(stage, oldPos, newPosition);
      } else {
        db.prepare('UPDATE tasks SET position = position + 1 WHERE stage = ? AND position >= ? AND position < ?').run(stage, newPosition, oldPos);
      }
    } else {
      db.prepare('UPDATE tasks SET position = position + 1 WHERE stage = ? AND position >= ?').run(stage, newPosition);
    }

    db.prepare('UPDATE tasks SET stage = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stage, newPosition, taskId);

    let resultTasks;
    if (req.user.role === 'admin') {
      resultTasks = db.prepare(`
        SELECT t.*, c.name as customer_name 
        FROM tasks t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        ORDER BY t.stage, t.position, t.created_at
      `).all();
    } else {
      resultTasks = db.prepare(`
        SELECT t.*, c.name as customer_name 
        FROM tasks t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.customer_id IN (SELECT customer_id FROM user_customers WHERE user_id = ?)
        ORDER BY t.stage, t.position, t.created_at
      `).all(req.user.id);
    }

    res.json(resultTasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при перемещении' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }

  if (req.user.role !== 'admin') {
    const hasAccess = db.prepare(
      'SELECT 1 FROM user_customers WHERE user_id = ? AND customer_id = ?'
    ).get(req.user.id, task.customer_id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
  }

  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    db.prepare('UPDATE tasks SET position = position - 1 WHERE stage = ? AND position > ?').run(task.stage, task.position);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;