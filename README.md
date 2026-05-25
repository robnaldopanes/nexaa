# NEXAA - Plataforma de Noticias Regionales con IA

Plataforma automática de noticias regionales para Chile, comenzando por la Región de Ñuble, con inteligencia artificial para resumir noticias, automatización, y panel de administración avanzado.

## Estructura del Proyecto

```
nexaa/
├── frontend/           # Next.js 14 + Tailwind CSS
│   ├── src/
│   │   ├── app/        # App Router (pages)
│   │   ├── components/ # UI components
│   │   └── lib/        # Utils, types, constants
│   └── public/         # Static assets
├── backend/            # Node.js + Express API
│   └── src/
│       ├── routes/     # API routes
│       ├── services/   # OpenAI, scrapers
│       └── utils/      # Supabase client
├── database/           # Supabase SQL schema
└── n8n/                # Automation workflows
```

## Tecnologías

- **Frontend**: Next.js 14, React 18, Tailwind CSS 3, Material Symbols
- **Backend**: Node.js, Express
- **Base de datos**: Supabase (PostgreSQL)
- **IA**: OpenAI API (GPT-4o-mini)
- **Automatización**: n8n
- **Hosting**: Vercel (frontend)

## Instalación

### Requisitos

- Node.js 18+
- Cuenta Supabase
- API Key de OpenAI
- (Opcional) n8n para automatizaciones

### Configuración

1. Clona el repositorio
2. Copia las variables de entorno:

```bash
cp frontend/.env.local.example frontend/.env.local
```

3. Configura las variables en `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
```

4. Ejecuta el esquema SQL en Supabase:

```bash
# Copia y ejecuta database/schema.sql en el SQL Editor de Supabase
```

5. Instala dependencias:

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### Desarrollo

```bash
# Frontend (Next.js)
cd frontend && npm run dev

# Backend (API)
cd backend && npm run dev
```

## Características

### Páginas Públicas

- **Inicio** - Noticias destacadas, resumen IA, últimas noticias
- **Fotos** - Galería de fotografías de Ñuble
- **Categorías** - Navegación por temas
- **Comunas** - Noticias por cada comuna de Ñuble
- **Buscar** - Búsqueda avanzada

### Panel Admin

- Dashboard con estadísticas
- Moderación de noticias IA (aprobar/rechazar/editar)
- Publicación manual pegando enlaces
- Gestión de fotografías
- Gestión de publicidad
- Estadísticas y analíticas

### Funciones IA

- Búsqueda automática de noticias cada 15 min
- Generación de titulares y resúmenes
- Detección de categorías
- Detección de noticias duplicadas
- Etiquetas SEO automáticas

### Automatizaciones (n8n)

- `news-fetcher.json` - Busca noticias RSS + IA cada 15 min
- `social-publisher.json` - Publica noticias aprobadas en Facebook y Telegram

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/news | Lista noticias |
| POST | /api/news/auto-fetch | Buscar noticias automáticamente |
| POST | /api/news/analyze-url | Analizar enlace con IA |
| GET | /api/photos | Lista fotos |
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/ai/summarize | Generar resumen IA |

## Licencia

Privado - Todos los derechos reservados.
