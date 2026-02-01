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

замечания по преподам
пароль при редактировании показывается только перед перезагрузкой страницы. нужно всегда его показывать в открытом виде.

задачи по группам
при создании препода и переходе в группу не подтягивается новый препод
дата компонент не вводится (и нужно сначала дни/месяца/годы)
время ставится не удобно
нужно чтобы выводились группы, а когда проваливаешься как в журнале расписать
подправить русский текст в модалке создания группы

доп задачи
почему я не могу открыть мой сайт с других устройств?
надо сделать чтобы еще заходило от преподов, но им доступно было только аккардион с группами

иногда происхоидт бесконечный refresh
мб даты и время как-то по другому сделать как в старом журнале
при редактировании группы не показывает прысутничау чи не
разделить цветами когда урок. мб даже сделать таблицей и мини календариком