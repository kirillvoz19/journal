-- Refresh tokens for teachers (teachers log in with teachers.username/passwordHash, not users)
CREATE TABLE IF NOT EXISTS teacher_refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacherId INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teacher_refresh_token ON teacher_refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_teacher_refresh_teacher ON teacher_refresh_tokens(teacherId);
