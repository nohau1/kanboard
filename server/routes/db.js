import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

function escId(name) {
  return '`' + name.replace(/[`\\]/g, '') + '`';
}

router.get('/tables', async (req, res) => {
  try {
    const [rows] = await pool.execute('SHOW TABLES');
    const tableKey = Object.keys(rows[0] || {})[0];
    const tables = rows.map(r => r[tableKey]);
    res.json(tables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.get('/columns/:table', async (req, res) => {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${escId(req.params.table)}`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.get('/data/:table', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await pool.query(`SELECT * FROM ${escId(req.params.table)} LIMIT ${limit} OFFSET ${offset}`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.post('/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'Введите запрос' });

  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('DROP') || trimmed.startsWith('ALTER') || trimmed.startsWith('TRUNCATE')) {
    return res.status(403).json({ error: 'Запрещённая операция' });
  }

  try {
    const [rows] = await pool.query(sql);
    res.json({ rows, affected: Array.isArray(rows) ? rows.length : rows.affectedRows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;