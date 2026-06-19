# SchoolManager Pro

**Educational Management System** — Multi-tenant SaaS para gestión académica de colegios.

Stack: Django 5 + DRF (Backend) | React 19 + Vite + TS (Frontend) | Tauri (Desktop)

---

## 📋 Estado actual

- ✅ **Auditoría completada:** Full-stack review como ingeniero senior
- ✅ **8/8 tests backend:** Pasando (incluido 3 nuevos de regresión)
- ✅ **Build frontend:** Green (`tsc -b && vite build` exitoso)
- ✅ **Seguridad:** Vulnerabilidades críticas corregidas
- ✅ **Documentación:** Técnica + resumen para cliente en español

**Última actualización:** Junio 2026

---

## 🔒 Cambios críticos de seguridad

### Aislamiento multi-tenant (cross-school data leak — FIXED)
- Tenant ahora derivado de JWT firmado, no de headers spoofables
- `TenantManager` es fail-closed (`.none()` sin contexto)
- Todos los endpoints validados para tenant isolation

### Caché compartido entre colegios (FIXED)
- Cache_page reemplazado por caching manual con claves por tenant
- Controles de acceso movidos **antes** de cache reads

### Validación de FKs cruzados (FIXED)
- `TenantPrimaryKeyRelatedField` restringe docentes/tutores a su tenant
- `batch_create` valida alumno tenancy + atomicidad

---

## 🚀 Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Tests:**
```bash
python manage.py test academics.tests --verbosity=2
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

**Build:**
```bash
npm run build
```

---

## 📚 Documentación

- **[AUDITORIA_Y_CORRECCIONES_JUNIO_2026.md](docs/AUDITORIA_Y_CORRECCIONES_JUNIO_2026.md)** — Auditoría técnica completa (hallazgos, causa raíz, correcciones)
- **[RESUMEN_CLIENTE_AUDITORIA_JUNIO_2026.md](docs/RESUMEN_CLIENTE_AUDITORIA_JUNIO_2026.md)** — Resumen en lenguaje simple para stakeholders
- **[MEJORAS_TECNICAS_JUNIO_2026.md](docs/MEJORAS_TECNICAS_JUNIO_2026.md)** — Mejoras funcionales previas

---

## 🔧 Configuración

### `.env` (Backend)

```bash
DJANGO_SECRET_KEY=<your-secure-key>
DJANGO_DEBUG=False  # En producción
ALLOWED_HOSTS=tudominio.com,www.tudominio.com
CORS_ALLOWED_ORIGINS=https://tudominio.com
REDIS_URL=redis://localhost:6379/1  # Requerido en producción
DATABASE_URL=postgresql://user:pass@localhost/schoolmanager  # Migrar de SQLite
```

### `VITE_API_URL` (Frontend)

```bash
VITE_API_URL=https://api.tudominio.com
```

---

## 📊 Arquitectura

```
backend/
├── academics/      # Modelos: Student, GradeLevel, Subject, Note, Attendance, etc.
├── users/          # Auth, User roles (ADMIN, DOCENTE, PADRE, DIRECTIVO)
├── tenants/        # Multi-tenant isolation
├── analytics/      # Dashboard, alertas, report cards
├── reports/        # PDF generation
└── core/           # Settings, WSGI, URLs

frontend/
├── pages/          # Dashboard, Gradebook, Analytics, Settings...
├── components/     # Header, Sidebar, Layout, Modals
├── analytics/      # Charts (GradePerformance, Heatmap, Radar)
├── store/          # Zustand (auth, language)
└── lib/            # API client, translations
```

---

## 🐝 Próximas mejoras recomendadas

1. **Design system unificado** — Colores (azul marino + dorado), tipografía, animaciones Framer Motion
2. **Ruta de API inconsistente** — Validar `/api/academics/grades/` vs `/api/grados/` (requiere app viva)
3. **Migración a PostgreSQL** — SQLite no soporta escritura concurrente
4. **Refresh automático de JWT** — Actualmente 60 min hard timeout
5. **Secure store para Tauri** — JWT en localStorage es XSS-exfiltratable

---

## 📜 Licencia

Privado (SchoolManager Pro)

---

## 👤 Autor

Rolando Gamarra | rolandofgamarra@gmail.com

