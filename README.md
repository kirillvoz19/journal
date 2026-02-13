# Journal - React TypeScript App для Cloudflare Pages

Приложение для ведения дневника с бэкендом на Cloudflare Pages Functions и базой данных D1.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Создание базы данных D1

```bash
# Создать базу данных
npx wrangler d1 create journal-db2

# Это выведет database_id, который нужно добавить в wrangler.toml
```

### 3. Настройка wrangler.toml

Откройте `wrangler.toml` и раскомментируйте секцию `[[d1_databases]]`, затем добавьте ваш `database_id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "journal-db2"
database_id = "ваш-database-id"
```

### 4. Инициализация базы данных

```bash
# Применить схему к локальной базе
npx wrangler d1 execute journal-db2 --local --file=./schema.sql

```
Если база уже существует и вы обновляете схему (например, после добавления новых колонок), примените миграцию вручную:

```bash
# Добавить колонку "пробный урок" в расписание занятий (локально)
npx wrangler d1 execute journal-db2 --local --command="ALTER TABLE group_schedules ADD COLUMN isTrialLesson INTEGER NOT NULL DEFAULT 0;"

# Добавить колонку "комментарий" к занятию (локально)
npx wrangler d1 execute journal-db2 --local --command="ALTER TABLE group_schedules ADD COLUMN comment TEXT;"

# То же самое для продакшн базы
npx wrangler d1 execute journal-db2 --remote --command="ALTER TABLE group_schedules ADD COLUMN isTrialLesson INTEGER NOT NULL DEFAULT 0;"

# То же самое для продакшн базы
npx wrangler d1 execute journal-db2 --remote --command="ALTER TABLE group_schedules ADD COLUMN comment TEXT;"
```
и для локальной разработки нужно запустить скрипт для генерации хеша пароля админа

```bash
npx tsx scripts/generate-password-hash-pbkdf2.ts

npx wrangler d1 execute journal-db2 --local --command="INSERT OR IGNORE INTO users (username, passwordHash) VALUES ('admin', 'rexn5P...<password>');"
```

```bash

# Применить схему к продакшн базе
npx wrangler d1 execute journal-db2 --remote --file=./schema.sql
```

### 5. Переменные окружения (секреты)

Для продакшна задайте в Cloudflare Dashboard → Pages → проект → Settings → Environment variables → New repository secret:

- **JWT_SECRET** — секрет для JWT (доступ и refresh токены); от него же выводится ключ шифрования паролей преподавателей.

#### Supabase (для деплоя на GitHub Pages + Supabase)

1. **Фронт (переменные):**
   - Скопируйте `.env.example` в `.env` и заполните:
     - **VITE_SUPABASE_URL** — Project URL из Supabase Dashboard → Settings → API
     - **VITE_SUPABASE_ANON_KEY** — обязательно **Anon key (Legacy)** в формате JWT (строка начинается с `eyJ...`). Не использовать Publishable key — шлюз Edge Functions вернёт 401 Invalid JWT.
   - Для сборки на GitHub: в репозитории Settings → Secrets and variables → Actions создайте:
     - **SUPABASE_URL** — тот же URL
     - **SUPABASE_ANON_KEY** — тот же ключ

2. **БД:** в Supabase Dashboard → SQL Editor выполните миграцию из `supabase/migrations/20250211120000_initial.sql` (создаёт таблицы).

3. **Секреты Edge Functions:** в Supabase Dashboard → Project Settings → Edge Functions → Secrets добавьте:
   - **JWT_SECRET** — секрет для JWT и шифрования паролей преподавателей (тот же, что раньше в Cloudflare).

4. **Деплой функций:** установите [Supabase CLI](https://supabase.com/docs/guides/cli), привяжите проект и задеплойте:
   ```bash
   npx supabase login
   npx supabase link --project-ref mukekoqsybvropsmzuhj
   npx supabase functions deploy login
   npx supabase functions deploy refresh
   npx supabase functions deploy teachers
   npx supabase functions deploy teacher-password
   npx supabase functions deploy groups
   npx supabase functions deploy attendance
   npx supabase functions deploy backup
   ```
   Или одной командой: `npx supabase functions deploy`

   npx supabase login
   npx supabase link --project-ref mukekoqsybvropsmzuhj
   npx supabase functions deploy

### 6. Локальная разработка

Для разработки нужно запустить и фронтенд, и бэкенд. Есть два способа:

**Способ 1: Запустить всё одной командой (рекомендуется)**
```bash
npm run dev:all
```

Эта команда запустит:
- Vite dev сервер на `http://localhost:5173` (фронтенд)
- Cloudflare Pages Functions на `http://localhost:8788` (бэкенд)

**Способ 2: Запустить отдельно в разных терминалах**
```bash
# Терминал 1: Запустить бэкенд
npm run dev:api

# Терминал 2: Запустить фронтенд
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

## 📝 Скрипты

- `npm run dev` - Запуск только фронтенда (Vite dev сервер)
- `npm run dev:api` - Запуск только бэкенда (Cloudflare Pages Functions на порту 8788)
- `npm run dev:all` - Запуск фронтенда и бэкенда одновременно (рекомендуется для разработки)
- `npm run build` - Сборка проекта для продакшна
- `npm run preview` - Предпросмотр собранного проекта
- `npm run lint` - Проверка кода линтером

## 🌐 Деплой на Cloudflare Pages

### Через Git интеграцию (рекомендуется)

1. Закоммитьте код в Git репозиторий (GitHub, GitLab, Bitbucket)
2. В Cloudflare Dashboard перейдите в Pages
3. Создайте новый проект и подключите ваш репозиторий
4. Настройки сборки:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (или оставьте пустым)

### Через Wrangler CLI

```bash
# Войдите в Cloudflare
npx wrangler login

# Деплой
npx wrangler pages deploy dist
```

### Настройка базы данных для продакшна

После создания базы данных через `wrangler d1 create`, она автоматически будет доступна в Cloudflare Pages. Убедитесь, что в `wrangler.toml` указан правильный `database_id`.

## 🗄️ Работа с базой данных

### Локальные команды

```bash
# Выполнить SQL запрос локально
npx wrangler d1 execute journal-db2 --local --command="SELECT * FROM entries"

# Выполнить SQL файл локально
npx wrangler d1 execute journal-db2 --local --file=./schema.sql
```

### Продакшн команды

```bash
# Выполнить SQL запрос в продакшн
npx wrangler d1 execute journal-db2 --remote --command="SELECT * FROM entries"

# Выполнить SQL файл в продакшн
npx wrangler d1 execute journal-db2 --remote --file=./schema.sql
```

## 📁 Структура проекта

```
journal/
├── functions/           # Cloudflare Pages Functions
│   └── api/
│       └── entries.ts   # API endpoints для записей
├── src/                 # React приложение
│   ├── App.tsx         # Главный компонент
│   ├── App.css         # Стили приложения
│   ├── main.tsx        # Точка входа
│   └── index.css       # Глобальные стили
├── schema.sql          # SQL схема базы данных
├── wrangler.toml       # Конфигурация Cloudflare
├── vite.config.ts      # Конфигурация Vite
└── package.json        # Зависимости проекта
```

## 🔧 API Endpoints

- `GET /api/entries` - Получить все записи
- `POST /api/entries` - Создать новую запись

## 📚 Дополнительные ресурсы

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [Cloudflare D1 Database](https://developers.cloudflare.com/d1/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

доп задачи
переписать на suppabase чтобы можно было зайти без vpn
перенести данные из старого сайта на новый

я выполнил скрипт миграции. но когда зашел в table editor, вижу у таблиц unrestricted "This table can be accessed by anyone via the Data API as RLS is disabled". 

- пернести данные из старой базы
- сделать возможность логина по русским буквам