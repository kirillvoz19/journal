-- Храним пароль преподавателя в зашифрованном виде (ключ = JWT_SECRET); админ получает расшифровку по запросу GET /api/teachers/:id/password
ALTER TABLE teachers ADD COLUMN passwordEncrypted TEXT;
