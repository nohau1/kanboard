# Kanban Board

[Русский](#ru) · [English](#en)

---

<a id="ru" name="ru"></a>

## Русский

Система управления задачами с канбан-доской и финансовой частью.

### Функционал

#### Задачи
- Создание, редактирование, удаление задач
- Drag-and-drop между стадиями (К выполнению → В работе → Тестирование → Готово → Оплачено)
- Поля: название, заказчик, стадия, срок (дата+время с шагом 30 мин), стоимость, часы, описание
- Вложения: файлы, картинки (с миниатюрами), аудио (с плеером), скриншоты из буфера обмена
- История смены стадий (кто, когда, куда)
- Ссылка на задачу для шаринга (`#task/t123`)

#### Представления
- **По стадиям** — классическая канбан-доска с колонками и drag-and-drop, фильтр по заказчику
- **По заказчикам** — группировка по заказчикам с фильтрами по стадиям
- **Календарь** — день/неделя/месяц с итогами по стоимости и часам
- **Финансы** — счета, привязка задач, отметка оплаты

#### Финансы
- Создание счетов для заказчиков
- Автозаполнение задачами по выбранным стадиям (по умолчанию Тестирование + Готово)
- Отметка оплаты → задачи переходят в стадию «Оплачено»
- Отмена оплаты → возврат в «Готово»
- Редактирование дат создания и оплаты счёта
- Удаление задач из счёта

#### Пользователи
- Роли: админ, пользователь
- Админ управляет пользователями, заказчиками, задачами
- Пользователи видят только задачи своих заказчиков
- JWT-авторизация

#### Админка
- Управление пользователями (создание, роли, привязка к заказчикам)
- Управление заказчиками (реквизиты: ИНН, юр. название, адрес, телефон)
- Просмотр всех задач с редактированием
- Веб-инструмент для работы с БД (обзор таблиц, SQL-запросы, inline-редактирование ячеек)

### Технологии

**Frontend:**
- React 19 + Vite 8
- @dnd-kit (drag-and-drop)
- CSS (без фреймворков)

**Backend:**
- Express 4
- MySQL 2
- JWT (jsonwebtoken)
- bcryptjs
- multer (загрузка файлов)
- sharp (миниатюры изображений)
- cors

**Инфраструктура:**
- Nginx (reverse proxy, SSL, раздача статики)
- pm2 (управление процессом)

### Структура проекта

```
kanboard/
├── server/              # Backend
│   ├── index.js         # Express app
│   ├── db.js            # MySQL connection + schema
│   ├── env.js           # .env loader
│   ├── middleware/
│   │   └── auth.js      # JWT middleware
│   ├── routes/
│   │   ├── auth.js      # Login, register
│   │   ├── tasks.js     # Tasks CRUD + history
│   │   ├── customers.js # Customers CRUD
│   │   ├── users.js     # Users CRUD
│   │   ├── invoices.js  # Invoices (finance)
│   │   ├── attachments.js # File uploads
│   │   └── db.js        # DB tool (admin only)
│   └── uploads/         # Uploaded files (gitignored)
├── src/                 # Frontend
│   ├── components/
│   │   ├── TaskModal.jsx
│   │   ├── TaskCard.jsx
│   │   ├── KanbanBoard.jsx
│   │   ├── CustomerKanbanBoard.jsx
│   │   ├── Calendar.jsx
│   │   ├── FinanceBoard.jsx
│   │   ├── AdminPanel.jsx
│   │   ├── DBTool.jsx
│   │   ├── ImagePreview.jsx
│   │   ├── AudioPlayer.jsx
│   │   └── ...
│   ├── App.jsx
│   ├── App.css
│   └── api.js
├── dist/                # Build output (gitignored)
└── package.json
```

### Установка и запуск

#### Требования
- Node.js 18+
- MySQL 8+
- Nginx (для продакшена)

#### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd kanboard
```

#### 2. Установить зависимости

```bash
npm install
cd server && npm install && cd ..
```

#### 3. Настроить переменные окружения

Скопировать шаблон и заполнить своими значениями:

```bash
cp .env.example .env
```

Содержимое `.env`:

```env
# Database
DB_HOST=localhost
DB_USER=kanban
DB_PASSWORD=your_password
DB_NAME=kanban

# JWT secret (обязательно) — сгенерировать: openssl rand -hex 32
JWT_SECRET=your-secret-key

# Пароль администратора по умолчанию (только при первом запуске)
ADMIN_PASSWORD=admin123

# Server
PORT=3001
```

> ⚠️ **`.env` не коммитится в git** (он в `.gitignore`). Никогда не публикуйте реальные пароли и секреты.
> `JWT_SECRET` обязателен — без него сервер не запустится.

#### 4. Создать базу данных

```sql
CREATE DATABASE kanban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kanban'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON kanban.* TO 'kanban'@'localhost';
FLUSH PRIVILEGES;
```

Таблицы создадутся автоматически при первом запуске сервера.

#### 5. Запуск

**Development:**
```bash
# Frontend (dev server с HMR)
npm run dev

# Backend (в другом терминале)
cd server && npm run dev
```

**Production:**
```bash
# Собрать frontend
npm run build

# Запустить backend
cd server && pm2 start index.js --name kanban
pm2 save
pm2 startup
```

#### 6. Настроить Nginx

Пример конфига:

```nginx
server {
    server_name your-domain.com;
    root /path/to/kanboard/dist;
    index index.html;
    client_max_body_size 1024m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /path/to/kanboard/server/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}

server {
    if ($host = your-domain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name your-domain.com;
    return 404;
}
```

### Дефолтные учётные данные

После первого запуска создаётся админ:
- Логин: `admin`
- Пароль: значение `ADMIN_PASSWORD` из `.env` (по умолчанию `admin123`)

**Смените пароль сразу после первого входа!**

### Безопасность

- Все секреты (пароли БД, JWT-секрет) хранятся только в `.env` — он в `.gitignore`
- `JWT_SECRET` обязателен, сгенерируйте случайный: `openssl rand -hex 32`
- Пароли пользователей хешируются через bcrypt
- Не коммитьте `.env`, `server/uploads/` и реальные конфиги с доступом

---

<a id="en" name="en"></a>

## English

Task management system with a Kanban board and a finance module.

### Features

#### Tasks
- Create, edit, delete tasks
- Drag-and-drop between stages (To Do → In Progress → Testing → Done → Paid)
- Fields: title, customer, stage, due date (date + time in 30-minute steps), cost, hours, description
- Attachments: files, images (with thumbnails), audio (with player), clipboard screenshots
- Stage change history (who, when, from → to)
- Shareable task link (`#task/t123`)

#### Views
- **By stages** — classic Kanban board with columns and drag-and-drop, customer filter
- **By customers** — grouped by customer with stage filters
- **Calendar** — day/week/month with cost and hours totals
- **Finance** — invoices, task linking, payment marking

#### Finance
- Create invoices for customers
- Auto-fill with tasks by selected stages (default: Testing + Done)
- Mark as paid → tasks move to the "Paid" stage
- Unmark payment → back to "Done"
- Edit invoice creation and payment dates
- Remove tasks from an invoice

#### Users
- Roles: admin, user
- Admin manages users, customers and tasks
- Users see only their own customers' tasks
- JWT authentication

#### Admin panel
- User management (create, roles, customer assignment)
- Customer management (details: INN / tax ID, legal name, address, phone)
- View all tasks with editing
- Web DB tool (table browser, SQL queries, inline cell editing)

### Tech stack

**Frontend:**
- React 19 + Vite 8
- @dnd-kit (drag-and-drop)
- CSS (no frameworks)

**Backend:**
- Express 4
- MySQL 2
- JWT (jsonwebtoken)
- bcryptjs
- multer (file uploads)
- sharp (image thumbnails)
- cors

**Infrastructure:**
- Nginx (reverse proxy, SSL, static files)
- pm2 (process manager)

### Project structure

```
kanboard/
├── server/              # Backend
│   ├── index.js         # Express app
│   ├── db.js            # MySQL connection + schema
│   ├── env.js           # .env loader
│   ├── middleware/
│   │   └── auth.js      # JWT middleware
│   ├── routes/
│   │   ├── auth.js      # Login, register
│   │   ├── tasks.js     # Tasks CRUD + history
│   │   ├── customers.js # Customers CRUD
│   │   ├── users.js     # Users CRUD
│   │   ├── invoices.js  # Invoices (finance)
│   │   ├── attachments.js # File uploads
│   │   └── db.js        # DB tool (admin only)
│   └── uploads/         # Uploaded files (gitignored)
├── src/                 # Frontend
│   ├── components/
│   │   ├── TaskModal.jsx
│   │   ├── TaskCard.jsx
│   │   ├── KanbanBoard.jsx
│   │   ├── CustomerKanbanBoard.jsx
│   │   ├── Calendar.jsx
│   │   ├── FinanceBoard.jsx
│   │   ├── AdminPanel.jsx
│   │   ├── DBTool.jsx
│   │   ├── ImagePreview.jsx
│   │   ├── AudioPlayer.jsx
│   │   └── ...
│   ├── App.jsx
│   ├── App.css
│   └── api.js
├── dist/                # Build output (gitignored)
└── package.json
```

### Installation

#### Requirements
- Node.js 18+
- MySQL 8+
- Nginx (for production)

#### 1. Clone the repository

```bash
git clone <repo-url>
cd kanboard
```

#### 2. Install dependencies

```bash
npm install
cd server && npm install && cd ..
```

#### 3. Configure environment variables

Copy the template and fill in your own values:

```bash
cp .env.example .env
```

`.env` contents:

```env
# Database
DB_HOST=localhost
DB_USER=kanban
DB_PASSWORD=your_password
DB_NAME=kanban

# JWT secret (required) — generate with: openssl rand -hex 32
JWT_SECRET=your-secret-key

# Default admin password (used only on first start)
ADMIN_PASSWORD=admin123

# Server
PORT=3001
```

> ⚠️ **`.env` is not committed to git** (it's in `.gitignore`). Never publish real passwords or secrets.
> `JWT_SECRET` is required — the server won't start without it.

#### 4. Create the database

```sql
CREATE DATABASE kanban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kanban'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON kanban.* TO 'kanban'@'localhost';
FLUSH PRIVILEGES;
```

Tables are created automatically on the first server start.

#### 5. Run

**Development:**
```bash
# Frontend (dev server with HMR)
npm run dev

# Backend (in another terminal)
cd server && npm run dev
```

**Production:**
```bash
# Build the frontend
npm run build

# Start the backend
cd server && pm2 start index.js --name kanban
pm2 save
pm2 startup
```

#### 6. Configure Nginx

Example config:

```nginx
server {
    server_name your-domain.com;
    root /path/to/kanboard/dist;
    index index.html;
    client_max_body_size 1024m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /path/to/kanboard/server/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}

server {
    if ($host = your-domain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name your-domain.com;
    return 404;
}
```

### Default credentials

On the first start an admin is created:
- Login: `admin`
- Password: the `ADMIN_PASSWORD` value from `.env` (default `admin123`)

**Change the password right after the first login!**

### Security

- All secrets (DB password, JWT secret) are stored only in `.env` — it's in `.gitignore`
- `JWT_SECRET` is required; generate a random one: `openssl rand -hex 32`
- User passwords are hashed with bcrypt
- Never commit `.env`, `server/uploads/` or real configs with credentials

---

## License

MIT
