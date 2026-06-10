import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'kanban.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_customers (
    user_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    PRIMARY KEY (user_id, customer_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    stage TEXT DEFAULT 'todo',
    customer_id TEXT NOT NULL,
    user_id TEXT,
    position INTEGER DEFAULT 0,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

try {
  db.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
} catch (e) {
  if (!e.message.includes('duplicate column')) console.log('due_date column already exists');
}

const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const password = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(
    'u1', 'admin', password, 'admin'
  );
}

const customersExist = db.prepare('SELECT id FROM customers').all();
if (customersExist.length === 0) {
  const insertCustomer = db.prepare('INSERT INTO customers (id, name) VALUES (?, ?)');
  insertCustomer.run('c1', 'ООО "Ромашка"');
  insertCustomer.run('c2', 'ИП Сидоров');
  insertCustomer.run('c3', 'АО "Мегакорп"');
}

const tasksExist = db.prepare('SELECT id FROM tasks').all();
if (tasksExist.length === 0) {
  const insertTask = db.prepare('INSERT INTO tasks (id, title, stage, customer_id, due_date) VALUES (?, ?, ?, ?, ?)');
  insertTask.run('t1', 'Дизайн главной страницы', 'todo', 'c1', '2026-06-15T14:00');
  insertTask.run('t2', 'Настройка сервера', 'todo', 'c2', '2026-06-12T10:00');
  insertTask.run('t3', 'Интеграция API', 'in-progress', 'c1', '2026-06-14T16:00');
  insertTask.run('t4', 'Тестирование модуля', 'testing', 'c3', '2026-06-16T12:00');
  insertTask.run('t5', 'Документация', 'done', 'c2', '2026-06-10T18:00');
  insertTask.run('t6', 'Исправление багов', 'done', 'c1', '2026-06-11T09:00');
  insertTask.run('t7', 'Оптимизация БД', 'todo', 'c3', '2026-06-18T15:00');
  insertTask.run('t8', 'Деплой на prod', 'testing', 'c2', '2026-06-17T11:00');
}

export default db;