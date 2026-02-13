# Journal - React TypeScript App for LinguaLand School Internal Use

Приложение для ведения дневника для школы LinguaLand. 

**Деплой функций:**
   ```bash
   npx supabase login
   npx supabase functions deploy
   ```

**Чтобы бесплатный проект Supabase не засыпал:** в GitHub → Settings → Secrets and variables → Actions добавь секреты `SUPABASE_ANON_KEY` (значение из `VITE_SUPABASE_ANON_KEY` в .env) и `SUPABASE_PROJECT_REF` (поддомен из `VITE_SUPABASE_URL`, например из `https://abc.supabase.co` → `abc`). Workflow `.github/workflows/ping-supabase.yml` раз в 5 дней пингует API.

доп задачи
- я выполнил скрипт миграции. но когда зашел в table editor, вижу у таблиц unrestricted "This table can be accessed by anyone via the Data API as RLS is disabled". 
- пернести данные из старой базы