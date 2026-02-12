-- Journal app schema for Supabase (Postgres)
-- Run in Supabase SQL Editor or via: supabase db push

CREATE TABLE IF NOT EXISTS entries (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries("createdAt" DESC);

-- Users (admin)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teachers (before teacher_refresh_tokens due to FK)
CREATE TABLE IF NOT EXISTS teachers (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "passwordEncrypted" TEXT,
  "fullName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_fullname ON teachers("fullName");

-- Refresh tokens (users)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens("userId");

-- Refresh tokens (teachers)
CREATE TABLE IF NOT EXISTS teacher_refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  "teacherId" BIGINT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_refresh_token ON teacher_refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_teacher_refresh_teacher ON teacher_refresh_tokens("teacherId");

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "teacherId" BIGINT REFERENCES teachers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  "customSubject" TEXT,
  level TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups("teacherId");

-- Group schedules
CREATE TABLE IF NOT EXISTS group_schedules (
  id BIGSERIAL PRIMARY KEY,
  "groupId" BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "isTrialLesson" BOOLEAN NOT NULL DEFAULT false,
  comment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_schedules_group ON group_schedules("groupId");
CREATE INDEX IF NOT EXISTS idx_group_schedules_date ON group_schedules(date);

-- Group students
CREATE TABLE IF NOT EXISTS group_students (
  id BIGSERIAL PRIMARY KEY,
  "groupId" BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  "fullName" TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students("groupId");

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  "studentId" BIGINT NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  "scheduleId" BIGINT NOT NULL REFERENCES group_schedules(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("studentId", "scheduleId")
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance("studentId");
CREATE INDEX IF NOT EXISTS idx_attendance_schedule ON attendance("scheduleId");
