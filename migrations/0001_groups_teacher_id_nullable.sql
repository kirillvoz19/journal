-- Миграция: при удалении преподавателя группы не удаляются, teacherId становится NULL.
-- Выполнить один раз на существующей БД, если схема уже применялась со старым вариантом (ON DELETE CASCADE).

-- SQLite не позволяет изменить FK/NOT NULL у колонки, поэтому пересоздаём таблицу.
-- npx wrangler d1 execute journal-db2 --local --file=./migrations/0001_groups_teacher_id_nullable.sql

CREATE TABLE IF NOT EXISTS groups_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacherId INTEGER,
  subject TEXT NOT NULL,
  customSubject TEXT,
  level TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE SET NULL
);

INSERT INTO groups_new (id, name, teacherId, subject, customSubject, level, createdAt)
SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups;

DROP TABLE groups;
ALTER TABLE groups_new RENAME TO groups;

CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacherId);
