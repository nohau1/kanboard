# Kanban Board

Система управления задачами с канбан-доской и финансовой частью.

## Функционал

### Задачи
- Создание, редактирование, удаление задач
- Drag-and-drop между стадиями (К выполнению → В работе → Тестирование → Готово → Оплачено)
- Поля: название, заказчик, стадия, срок (дата+время с шагом 30 мин), стоимость, часы, описание
- Вложения: файлы, картинки (с миниатюрами), аудио (с плеером), скриншоты из буфера обмена
- История смены стадий (кто, когда, куда)
- Ссылка на задачу для шаринга (`#task/t123`)

### Представления
- **По стадиям** — классическая канбан-доска с колонками и drag-and-drop
- **По заказчикам** — группировка по заказчикам с фильтрами по стадиям
- **Календарь** — день/неделя/месяц с итогами по стоимости и часам
- **Финансы** — счета, привязка задач, отметка оплаты

### Финансы
- Создание счетов для заказчиков
- Автозаполнение задачами по выбранным стадиям (по умолчанию Тестирование + Готово)
- Отметка оплаты → задачи переходят в стадию «Оплачено»
- Отмена оплаты → возврат в «Готово»
- Редактирование дат создания и оплаты счёта
- Удаление задач из счёта

### Пользователи
- Роли: админ, пользователь
- Админ управляет пользователями, заказчиками, задачами
- Пользователи видят только задачи своих заказчиков
- JWT-авторизация

### Админка
- Управление пользователями (создание, роли, привязка к заказчикам)
- Управление заказчиками (реквизиты: ИНН, юр. название, адрес, телефон)
- Просмотр всех задач с редактированием
- Веб-инструмент для работы с БД (обзор таблиц, SQL-запросы, inline-редактирование ячеек)

## Технологии

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

## Структура проекта

```
kanboard/
├── server/              # Backend
│   ├── index.js         # Express app
│   ├── db.js            # MySQL connection + schema
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

## Установка и запуск

### Требования
- Node.js 18+
- MySQL 8+
- Nginx (для продакшена)

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd kanboard
```

### 2. Установить зависимости

```bash
npm install
cd server && npm install && cd ..
```

### 3. Настроить переменные окружения

Создать `.env` в корне проекта:

```env
DB_HOST=localhost
DB_USER=kanban
DB_PASSWORD=your_password
DB_NAME=kanban
JWT_SECRET=your-secret-key
PORT=3001
```

### 4. Создать базу данных

```sql
CREATE DATABASE kanban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kanban'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON kanban.* TO 'kanban'@'localhost';
FLUSH PRIVILEGES;
```

Таблицы создадутся автоматически при первом запуске сервера.

### 5. Запуск

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

### 6. Настроить Nginx

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

## Дефолтные учётные данные

После первого запуска создаётся админ:
- Логин: `admin`
- Пароль: `admin123`

**Смените пароль сразу после первого входа!**

## Лицензия

MIT
