-- Store plaintext password for teachers so admin can view and share via messengers.
-- Only accessible to users with role 'admin' via API.

ALTER TABLE teachers ADD COLUMN passwordPlaintext TEXT;
