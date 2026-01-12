-- Database schema for Journal app
-- Run this to initialize your D1 database

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_created_at ON entries(createdAt DESC);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(userId);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  fullName TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_fullname ON teachers(fullName);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacherId INTEGER NOT NULL,
  subject TEXT NOT NULL,
  customSubject TEXT,
  level TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacherId);

-- Group schedules table
CREATE TABLE IF NOT EXISTS group_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupId INTEGER NOT NULL,
  date TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_schedules_group ON group_schedules(groupId);
CREATE INDEX IF NOT EXISTS idx_group_schedules_date ON group_schedules(date);

-- Group students table
CREATE TABLE IF NOT EXISTS group_students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupId INTEGER NOT NULL,
  fullName TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(groupId);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studentId INTEGER NOT NULL,
  scheduleId INTEGER NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (studentId) REFERENCES group_students(id) ON DELETE CASCADE,
  FOREIGN KEY (scheduleId) REFERENCES group_schedules(id) ON DELETE CASCADE,
  UNIQUE(studentId, scheduleId)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(studentId);
CREATE INDEX IF NOT EXISTS idx_attendance_schedule ON attendance(scheduleId);