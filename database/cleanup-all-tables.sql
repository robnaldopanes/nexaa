-- Función para limpiar todas las tablas y mantener límites
CREATE OR REPLACE FUNCTION cleanup_all_tables()
RETURNS void AS $$
BEGIN
  -- news_inbox: mantener últimos 100 registros
  DELETE FROM news_inbox WHERE id NOT IN (
    SELECT id FROM news_inbox ORDER BY created_at DESC LIMIT 100
  );
  
  -- user_submissions: mantener últimos 100 registros
  DELETE FROM user_submissions WHERE id NOT IN (
    SELECT id FROM user_submissions ORDER BY created_at DESC LIMIT 100
  );
  
  -- social_shares: mantener últimos 100 registros
  DELETE FROM social_shares WHERE id NOT IN (
    SELECT id FROM social_shares ORDER BY shared_at DESC LIMIT 100
  );
  
  -- ads: mantener últimos 10 registros (son pocos pero pesados por base64)
  DELETE FROM ads WHERE id NOT IN (
    SELECT id FROM ads ORDER BY created_at DESC LIMIT 10
  );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar limpieza manual:
SELECT cleanup_all_tables();

-- Para ejecución automática cada 6 horas con pg_cron:
-- 1. Habilitar extensión: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 2. Programar: SELECT cron.schedule('cleanup-all-tables', '0 */6 * * *', 'SELECT cleanup_all_tables()');
