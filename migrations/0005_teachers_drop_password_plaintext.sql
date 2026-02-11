-- Убираем хранение пароля в открытом виде; только passwordHash (как у users)
ALTER TABLE teachers DROP COLUMN passwordPlaintext;
