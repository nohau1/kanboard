import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

router.get('/download/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    
    const attachment = rows[0];
    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден на диске' });
    }
    
    res.download(filePath, attachment.original_name);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при скачивании' });
  }
});

router.use(authenticateToken);

router.get('/task/:taskId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at DESC',
      [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении вложений' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const { task_id } = req.body;
  if (!task_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Укажите task_id' });
  }

  const id = 'a' + Date.now();
  try {
    await pool.execute(
      'INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [id, task_id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    );
    
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Ошибка при сохранении' });
  }
});

router.post('/upload-base64', async (req, res) => {
  const { task_id, data, filename } = req.body;
  
  if (!task_id || !data) {
    return res.status(400).json({ error: 'Недостаточно данных' });
  }

  const id = 'a' + Date.now();
  const ext = filename ? filename.split('.').pop() : 'png';
  const mimeType = filename ? `image/${ext}` : 'image/png';
  const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const fileName = id + '.' + ext;
  const filePath = path.join(uploadDir, fileName);
  
  try {
    fs.writeFileSync(filePath, buffer);
    
    await pool.execute(
      'INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [id, task_id, fileName, filename || 'screenshot.png', mimeType, buffer.length]
    );
    
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при сохранении' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Вложение не найдено' });
    }
    
    const attachment = rows[0];
    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await pool.execute('DELETE FROM attachments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

export default router;