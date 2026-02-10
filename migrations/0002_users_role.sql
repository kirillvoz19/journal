-- Миграция: добавляем колонку role в users. Для username=admin ставим 'admin', у остальных NULL.
-- npx wrangler d1 execute journal-db2 --local --file=./migrations/0002_users_role.sql

ALTER TABLE users ADD COLUMN role TEXT;

UPDATE users SET role = 'admin' WHERE username = 'admin';
