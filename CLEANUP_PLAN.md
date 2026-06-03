# Plan de Limpieza Automática - Supabase Free Tier

**Fecha de creación:** 2026-06-03
**Estado:** Pendiente de implementación
**Objetivo:** No sobrepasar el límite gratuito de Supabase

---

## Límites del Plan Gratuito de Supabase

| Recurso | Límite Free |
|---------|-------------|
| Base de datos | 500 MB |
| Storage | 1 GB |
| Egress (transferencia) | 2 GB/mes |
| API requests | 500K/mes |

---

## Diagnóstico Actual

### ✅ Tablas con limpieza existente (`/api/cleanup`)

| Tabla | Política actual | Estado |
|-------|----------------|--------|
| `news_inbox` | Mantener últimos 100 | ✅ Controlado |
| `user_submissions` | Mantener últimos 100 | ✅ Controlado |
| `social_shares` | Mantener últimos 100 | ✅ Controlado |
| `ads` | Mantener últimos 10 | ✅ Controlado |

### 🔴 Tablas/recursos SIN limpieza

| Recurso | Riesgo | Impacto estimado |
|---------|--------|------------------|
| `news` (publicadas) | Medio | ~1KB por noticia + imagen |
| `photos` (galería usuarios) | Alto | Crecimiento ilimitado |
| Storage `news-images` | Alto | 1GB se llena en 2-3 meses con uploads diarios |
| `news` `is_breaking` | Bajo | Pocas noticias breaking |

---

## Plan Propuesto: Limpieza Semanal

### Reglas de Retención

| Recurso | Cuándo borrar | Razón |
|---------|---------------|-------|
| `news` publicadas | Después de **90 días** | Noticias pierden relevancia |
| `news` con `is_breaking=true` | Después de **7 días** | Urgente solo por 1 semana |
| `photos` (galería usuarios) | Después de **60 días** | Galería rotativa |
| `user_submissions` no aprobadas | Después de **30 días** | Ya se limpia a 100, pero 30 días es mejor |
| Storage imágenes huérfanas | Las que no se referencian en DB | Ahorra el 1GB |

### Frecuencia

**1 vez por semana** (lunes 3:00 AM UTC recomendado)

---

## Estimación con Limpieza Aplicada

Si se mantienen:
- Últimas **500 noticias** (~500KB en DB)
- Últimas **200 fotos** (~40KB en DB)
- Storage solo con imágenes referenciadas (~210MB si son 300KB cada una)

**Total estimado:** ~250-300MB → muy por debajo del límite de 500MB DB + 1GB Storage.

---

## Implementación Sugerida

### Paso 1: Nuevo endpoint `/api/cleanup/weekly`

Extender o reemplazar `/api/cleanup` con lógica más completa:

```typescript
// Lógica a implementar
- Borrar news con published_at < NOW() - 90 días (excepto is_breaking)
- Borrar news con is_breaking=true y published_at < NOW() - 7 días
- Borrar photos con created_at < NOW() - 60 días
- Borrar user_submissions no aprobadas con created_at < NOW() - 30 días
- Listar archivos en Storage que no estén referenciados en news.image_url ni photos.image_url
- Borrar archivos huérfanos de Storage
```

### Paso 2: Automatización (elegir una opción)

**Opción A: Cron externo (recomendado)**
- Servicio: [cron-job.org](https://cron-job.org) (gratis)
- Llamar: `POST https://tu-dominio.com/api/cleanup/weekly`
- Frecuencia: Cada lunes 3:00 AM

**Opción B: GitHub Actions**
```yaml
name: Weekly Cleanup
on:
  schedule:
    - cron: '0 3 * * 1'
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: curl -X POST https://tu-dominio.com/api/cleanup/weekly
```

**Opción C: Vercel Cron** (si migras a Vercel)

### Paso 3: Monitoreo

- Logs de cada ejecución (cuántos registros borrados)
- Alerta si el tamaño de DB o Storage supera 80% del límite
- Métricas en endpoint `/api/health` con tamaño actual

---

## Archivos a Crear/Modificar

### Nuevos
- `frontend/src/app/api/cleanup/weekly/route.ts` - Endpoint de limpieza semanal

### Modificar (opcional)
- `frontend/src/app/api/cleanup/route.ts` - Refactorizar para usar el nuevo endpoint
- `frontend/src/app/api/health/route.ts` - Agregar métricas de tamaño de DB/Storage

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Borrar noticias importantes por error | Solo borrar después de 90 días, log detallado antes de borrar |
| Romper referencias de imágenes | Solo borrar imágenes que NO estén en `news.image_url` ni `photos.image_url` |
| Cleanup falla y deja datos inconsistentes | Transacciones o borrado en orden: DB primero, luego Storage |
| Demorar mucho en ejecución | Limitar con `LIMIT 1000` por tabla, ejecutar en lotes |

---

## Comando de Prueba (cuando se implemente)

```bash
# Ejecutar limpieza manualmente
curl -X POST https://nexaa.up.railway.app/api/cleanup/weekly

# Ver tamaño actual de DB y Storage
curl https://nexaa.up.railway.app/api/health
```

---

## Estado

- [ ] Plan creado (2026-06-03)
- [ ] Pendiente de implementación
- [ ] Implementar endpoint `/api/cleanup/weekly`
- [ ] Configurar cron job
- [ ] Agregar métricas a `/api/health`
- [ ] Probar manualmente
- [ ] Monitorear primera semana

---

**Nota:** Por instrucción del usuario (2026-06-03), NO se implementa nada todavía. Se guarda este plan para implementar mañana.
