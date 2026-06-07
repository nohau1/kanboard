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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

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
  const insertTask = db.prepare('INSERT INTO tasks (id, title, stage, customer_id) VALUES (?, ?, ?, ?)');
  insertTask.run('t1', 'Дизайн главной страницы', 'todo', 'c1');
  insertTask.run('t2', 'Настройка сервера', 'todo', 'c2');
  insertTask.run('t3', 'Интеграция API', 'in-progress', 'c1');
  insertTask.run('t4', 'Тестирование модуля', 'testing', 'c3');
  insertTask.run('t5', 'Документация', 'done', 'c2');
  insertTask.run('t6', 'Исправление багов', 'done', 'c1');
  insertTask.run('t7', 'Оптимизация БД', 'todo', 'c3');
  insertTask.run('t8', 'Деплой на prod', 'testing', 'c2');
}

export default db;