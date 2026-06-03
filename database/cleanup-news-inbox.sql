-- Función para limpiar news_inbox manteniendo solo los últimos 100 registros
CREATE OR REPLACE FUNCTION cleanup_news_inbox()
RETURNS void AS $$
BEGIN
  DELETE FROM news_inbox
  WHERE id NOT IN (
    SELECT id FROM news_inbox
    ORDER BY created_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar limpieza manual: SELECT cleanup_news_inbox();

-- Para ejecución automática cada 6 horas con pg_cron:
-- SELECT cron.schedule('cleanup-news-inbox', '0 */6 * * *', 'SELECT cleanup_news_inbox()');
