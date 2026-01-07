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

# Применить схему к продакшн базе
npx wrangler d1 execute journal-db2 --remote --file=./schema.sql
```

### 5. Локальная разработка

```bash
# Собрать проект
npm run build

# Запустить локальный сервер с функциями
npm run dev
```

Приложение будет доступно по адресу `http://localhost:8788`

## 📝 Скрипты

- `npm run dev` - Запуск локального сервера разработки с Cloudflare Pages Functions
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
