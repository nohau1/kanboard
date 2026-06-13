import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'kanban',
  password: 'change-me',
  database: 'kanban',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+03:00',
});

async function initDb() {
  const connection = await pool.getConnection();
  
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_customers (
        user_id VARCHAR(50) NOT NULL,
        customer_id VARCHAR(50) NOT NULL,
        PRIMARY KEY (user_id, customer_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        stage VARCHAR(50) DEFAULT 'todo',
        customer_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50),
        position INT DEFAULT 0,
        due_date DATETIME,
        cost DECIMAL(12,2) DEFAULT 0,
        hours DECIMAL(8,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    try {
      await connection.execute('ALTER TABLE tasks ADD COLUMN due_date DATETIME');
    } catch (e) {
      if (!e.message.includes('Duplicate')) console.log('due_date column check done');
    }

    try {
      await connection.execute('ALTER TABLE tasks ADD COLUMN cost DECIMAL(12,2) DEFAULT 0');
    } catch (e) {
      if (!e.message.includes('Duplicate')) console.log('cost column check done');
    }

    try {
      await connection.execute('ALTER TABLE tasks ADD COLUMN hours DECIMAL(8,2) DEFAULT 0');
    } catch (e) {
      if (!e.message.includes('Duplicate')) console.log('hours column check done');
    }

    const [admins] = await connection.execute('SELECT id FROM users WHERE role = ?', ['admin']);
    if (admins.length === 0) {
      const password = bcrypt.hashSync('admin123', 10);
      await connection.execute(
        'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
        ['u1', 'admin', password, 'admin']
      );
    }

    const [customers] = await connection.execute('SELECT id FROM customers');
    if (customers.length === 0) {
      await connection.execute("INSERT INTO customers (id, name) VALUES ('c1', 'ООО \"Ромашка\"')");
      await connection.execute("INSERT INTO customers (id, name) VALUES ('c2', 'ИП Сидоров')");
      await connection.execute("INSERT INTO customers (id, name) VALUES ('c3', 'АО \"Мегакорп\"')");
    }

    const [tasks] = await connection.execute('SELECT id FROM tasks');
    if (tasks.length === 0) {
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t1', 'Дизайн главной страницы', 'todo', 'c1', '2026-06-15 14:00:00', 50000, 40]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t2', 'Настройка сервера', 'todo', 'c2', '2026-06-12 10:00:00', 25000, 16]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t3', 'Интеграция API', 'in-progress', 'c1', '2026-06-14 16:00:00', 80000, 60]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t4', 'Тестирование модуля', 'testing', 'c3', '2026-06-16 12:00:00', 30000, 24]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t5', 'Документация', 'done', 'c2', '2026-06-10 18:00:00', 15000, 10]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t6', 'Исправление багов', 'done', 'c1', '2026-06-11 09:00:00', 20000, 12]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t7', 'Оптимизация БД', 'todo', 'c3', '2026-06-18 15:00:00', 45000, 32]
      );
      await connection.execute(
        "INSERT INTO tasks (id, title, stage, customer_id, due_date, cost, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['t8', 'Деплой на prod', 'testing', 'c2', '2026-06-17 11:00:00', 35000, 20]
      );
    }

  } finally {
    connection.release();
  }
}

initDb().catch(console.error);

export default pool;