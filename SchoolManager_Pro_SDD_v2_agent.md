# SchoolManager Pro — Spec-Driven Development v2.0
## Agent Specification — Sistema de Gestión Escolar Híbrido

> **Autor:** Ing. Rolando Fariña — DevStudio.py}
> **Versión:** 2.0.0 | **Fecha:** Junio 2026 | **Estado:** Draft Final
> ⚠ Documento confidencial — Uso interno DevStudio.py}

---

## Historial de Versiones

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0.0 | Jun 2026 | Versión inicial: Auth, Notas, Asistencia, Socio-Afectivo, Boletines, PWA | Ing. Rolando Fariña |
| **2.0.0** | **Jun 2026** | **+ Tauri Desktop (Win/Mac/Linux), + SQLite local, + Sync Engine Rust, + Analíticas Python/Pandas, + Recharts Dashboard, + Redis Cache, + tenant_id escalabilidad SaaS** | **Ing. Rolando Fariña** |

---

## 1. Visión General del Proyecto

EduManager Pro v2.0 es un sistema de gestión escolar híbrido de tres capas: aplicación de escritorio multiplataforma (Windows, Mac, Linux) con capacidad offline total, portal web para padres y directivos, y panel de analíticas académicas con visualización de datos en tiempo real.

### 1.1 Objetivos Estratégicos

- Continuidad operativa total: docentes cargan notas y asistencia sin internet ni servidor activo.
- Sincronización automática y transparente al recuperar conexión.
- Analíticas académicas por grado y por alumno con gráficos interactivos profesionales.
- Ejecutable nativo para Windows, Mac y Linux desde un único código fuente.
- Arquitectura preparada para escalar a modelo SaaS multi-institución.
- Generación automática de boletines PDF con promedios calculados por Python/Pandas.
- Portal de padres accesible desde cualquier navegador y dispositivo.

### 1.2 Métricas del Sistema

| Parámetro | Valor | Observación |
|-----------|-------|-------------|
| Docentes | 50 total | 25 español / 25 inglés |
| Alumnos | ~1,500 | Población activa inicial |
| Padres / Tutores | ~1,500 cuentas | Solo lectura — portal web |
| Roles del sistema | 5 roles | Admin, Directivo, Docente, Padre, Enfermería |
| Plataformas desktop | 3 SO | Windows .exe / Mac .dmg / Linux .AppImage |
| Modo offline | 100% funcional | Sin internet, sin servidor, sin navegador |
| Disponibilidad web | 99.5% uptime | Con fallback offline garantizado |
| tenant_id | Desde v2.0 | Preparado para multi-institución / SaaS futuro |

---

## 2. Arquitectura Híbrida v2.0

### 2.1 Tres Capas del Sistema

| Capa | Tecnología | Función |
|------|-----------|---------|
| **DESKTOP** | Tauri 2.0 + React + SQLite | App nativa offline. Notas, asistencia, sync. Sin internet ni navegador. |
| **WEB** | React PWA + Django REST | Portal padres, dashboard directivos, acceso desde cualquier navegador. |
| **ANALYTICS** | Python Pandas + Recharts + Redis | Analíticas por grado y alumno. Gráficos interactivos en tiempo real. |

### 2.2 Diagrama de Flujo General

```
[ DOCENTE — PC con Tauri instalado ]
         |
  ¿Hay internet?
    NO → SQLite local (escribe notas/asistencia)  →  Cola de sync pendiente
    SÍ → API Django directamente              →  PostgreSQL central
         |
  [ Sync Engine Rust detecta red disponible ]
         |
  Cola SQLite → POST /api/sync/push/ → Django valida → PostgreSQL
         |
  Confirmación → SQLite marca SYNCED → Notificación al docente ✅
         |
[ PADRE — Cualquier navegador ]  →  React Web  →  Django API  →  PostgreSQL
[ DIRECTIVO — Dashboard ]        →  Analytics  →  Pandas/Redis →  PostgreSQL
```

### 2.3 Flujo de Sincronización Detallado

1. Docente abre Tauri app — se verifica estado de red en segundo plano.
2. Modo OFFLINE: toda escritura va a SQLite local con `sync_status = PENDING`.
3. Modo ONLINE: escritura directa a API Django + confirmación inmediata.
4. Sync Engine (Rust) monitorea red cada 30 segundos.
5. Al detectar conexión: lee cola PENDING de SQLite, envía batch a `/api/sync/push/`.
6. Django valida, resuelve conflictos por timestamp (server timestamp wins en conflicto).
7. PostgreSQL persiste. Django responde con IDs confirmados.
8. SQLite actualiza registros a `SYNCED`. App muestra notificación de éxito.
9. Log de conflictos queda en `sync_conflicts` para revisión del admin.

### 2.4 Resolución de Conflictos

| Escenario | Estrategia | Acción |
|-----------|-----------|--------|
| Misma nota editada online y offline | Timestamp wins | Gana el registro más reciente por timestamp UTC |
| Nota creada offline ya existe en servidor | Merge por ID | Se actualiza el registro existente, no se duplica |
| Conflicto no resolvible automáticamente | `CONFLICT` | Queda en sync_conflicts, admin resuelve manualmente |
| Alumno eliminado mientras estaba offline | Soft delete | Registro marcado inactivo, datos de notas preservados |

---

## 3. Stack Tecnológico Definitivo v2.0

### Desktop

| Tecnología | Versión | Justificación |
|-----------|---------|---------------|
| **Tauri 2.0** | 2.x | App nativa 5MB, Rust backend, webview del SO |
| SQLite (via Tauri plugin) | 3.x | Base de datos embebida, offline, ACID |
| Rust (Tauri commands) | 1.x | Rendimiento nativo, manejo de red y cola |
| Tauri Updater Plugin | 2.x | Distribución de versiones sin intervención manual |

### Frontend (compartido Tauri + Web)

| Tecnología | Versión | Justificación |
|-----------|---------|---------------|
| React 18 + TypeScript | 18.x | Tipado estático, ecosistema maduro |
| TailwindCSS | 3.x | Utilidades CSS, responsive, tema oscuro/claro |
| Framer Motion | 11.x | Transiciones fluidas y microinteracciones |
| Zustand | 4.x | Estado global liviano, sin boilerplate, offline-aware |
| React Query (TanStack) | 5.x | Cache inteligente de datos del servidor |
| React Hook Form + Zod | Latest | Validación tipada, alto rendimiento |

### Analíticas

| Tecnología | Versión | Justificación |
|-----------|---------|---------------|
| **Pandas + NumPy** | 2.x / 1.x | Promedios, percentiles, tablas pivot académicas |
| **Recharts** | 2.x | React-nativo, TypeScript, animaciones incluidas |
| react-calendar-heatmap | Latest | Visualización de asistencia tipo GitHub |
| Redis Cache (Django) | 7.x | Evita recalcular analíticas en cada request |

### Backend

| Tecnología | Versión | Justificación |
|-----------|---------|---------------|
| Django 5 + DRF | 5.x | Admin panel, ORM, permisos por roles |
| PostgreSQL 16 | 16.x | ACID, JSONB, queries complejas, escalable |
| Celery + Redis | 5.x | Sync background, boletines batch, emails |
| WeasyPrint | 60.x | Boletines PDF profesionales desde HTML/CSS |
| SimpleJWT + bcrypt | 5.x | Tokens RS256, refresh automático, seguro |

### Infraestructura

| Tecnología | Versión | Justificación |
|-----------|---------|---------------|
| Docker + Docker Compose | Latest | Orquestación reproducible de servicios |
| Nginx + Gunicorn | Latest | Proxy reverso, producción estable |
| GitHub Actions + Tauri Action | Latest | Build automático .exe .dmg .AppImage |

### Módulos Futuros

| Tecnología | Uso |
|-----------|-----|
| Claude / OpenAI API | Chatbot IA — endpoint desacoplado plug-and-play |
| Django App independiente | Módulo Enfermería |

---

## 4. Aplicación de Escritorio — Tauri 2.0

### 4.1 Tauri vs Electron

| Criterio | Tauri 2.0 ✅ | Electron ❌ |
|----------|------------|-----------|
| Tamaño del ejecutable | **~5 MB** | ~150 MB |
| Rendimiento | Rust nativo — muy alto | Node.js — moderado |
| Memoria RAM | < 50 MB en uso | > 300 MB en uso |
| Mismo frontend React | ✅ Sí | ✅ Sí |
| Seguridad | Modelo de permisos Rust estricto | Superficie de ataque amplia |
| Auto-update nativo | ✅ Incluido | Requiere electron-updater |
| Build Win/Mac/Linux | ✅ Un comando | ✅ Un comando |

### 4.2 Estructura del Proyecto Tauri

```
edumanager-pro/
  src-tauri/
    src/
      main.rs          → Punto de entrada Tauri
      sync.rs          → Sync Engine: detecta red, envía cola SQLite → API
      db.rs            → Operaciones SQLite: notas, asistencia, cola
      commands.rs      → Tauri commands expuestos al frontend React
      updater.rs       → Lógica de auto-actualización
    tauri.conf.json    → Configuración app, permisos, ventanas
    Cargo.toml         → Dependencias Rust
  src/                 → Frontend React compartido (idéntico al web)
  public/
    icons/             → Iconos para Win/Mac/Linux
```

### 4.3 Tauri Commands (API Interna)

| Command | Parámetros | Función |
|---------|-----------|---------|
| `save_nota` | alumno_id, materia_id, valor, timestamp | Guarda nota en SQLite con sync_status=PENDING |
| `save_asistencia` | alumno_id, fecha, estado | Registra asistencia local offline |
| `save_socioafectivo` | alumno_id, periodo, dimensiones JSON | Guarda evaluación socio-afectiva local |
| `get_pending_sync` | — | Retorna cola de registros PENDING para UI |
| `trigger_sync` | — | Fuerza sincronización manual con servidor |
| `check_network` | — | Verifica estado de conexión actual |
| `get_sync_status` | — | Retorna estadísticas: PENDING/SYNCED/CONFLICT |

### 4.4 Distribución Multiplataforma

| Sistema | Formato | Tamaño aprox. | Instalación |
|---------|---------|---------------|-------------|
| Windows | .exe (NSIS Installer) | ~8 MB | Doble clic → siguiente → finalizar |
| macOS | .dmg | ~6 MB | Arrastrar a Aplicaciones |
| Linux | .AppImage / .deb | ~7 MB | AppImage: ejecutar directo. .deb: apt install |

> Build automático via GitHub Actions con `tauri-action`: un push a `main` genera los tres instaladores simultáneamente.

---

## 5. Módulo de Analíticas — Python + Recharts

### 5.1 Pipeline Analítico

```
PostgreSQL  →  Django ORM (query)  →  Pandas (cálculo)  →  Redis (cache 1h)
                                                              |
React Recharts  ←  JSON response  ←  DRF Serializer  ←─────┘
```

### 5.2 Dashboard por Grado

| Gráfico | Tipo Recharts | Datos | Insight |
|---------|--------------|-------|---------|
| Promedio por materia | `BarChart` | avg(nota) por materia | Materias con bajo rendimiento del grado |
| Evolución por período | `LineChart` | avg por período | Tendencia de mejora o deterioro académico |
| Aprobados vs Reprobados | `PieChart` | count por estado | Porcentaje de aprobación general |
| Asistencia acumulada | `AreaChart` | % asistencia por mes | Patrón de ausentismo por período |
| Ranking de alumnos | `BarChart horizontal` | promedio por alumno | Top y bottom performers del grado |
| Distribución de notas | `BarChart (histograma)` | frecuencia por rango | Dispersión del rendimiento en el grado |

### 5.3 Dashboard por Alumno

| Gráfico | Tipo | Datos | Insight |
|---------|------|-------|---------|
| Rendimiento por materia | `RadarChart` | promedio por materia | Fortalezas y debilidades visuales |
| Progreso trimestral | `LineChart` | promedio vs grado | Comparativa alumno vs promedio del grado |
| Notas por materia | `BarChart agrupado` | notas vs promedio grado | Brecha entre alumno y clase |
| Asistencia anual | `CalendarHeatmap` | estado por día | Patrón visual de ausencias (tipo GitHub) |
| Indicadores socio-afectivos | `RadialBarChart` | score por dimensión | Desarrollo emocional y actitudinal |
| Tendencia de notas | `LineChart suavizado` | nota por evaluación | Curva de aprendizaje en el tiempo |

### 5.4 Endpoints de Analíticas

| Método | Endpoint | Cache | Descripción |
|--------|---------|-------|-------------|
| GET | `/api/analytics/grado/{id}/{periodo}/` | Redis 1h | Todas las métricas del grado |
| GET | `/api/analytics/alumno/{id}/{periodo}/` | Redis 1h | Todas las métricas del alumno |
| GET | `/api/analytics/institucion/{periodo}/` | Redis 2h | Métricas globales institucionales |
| GET | `/api/analytics/ranking/grado/{id}/` | Redis 30m | Ranking de alumnos del grado |
| POST | `/api/analytics/cache/invalidate/` | — | Invalida cache manualmente (Admin only) |

### 5.5 Lógica Python — Ejemplo de Cálculo

```python
# analytics/services.py
import pandas as pd
from django.core.cache import cache
from django.db.models import Avg, Count, Q
from academics.models import Grade

def get_grado_analytics(grado_id: int, periodo_id: int) -> dict:
    cache_key = f"analytics_grado_{grado_id}_{periodo_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached  # Retorna desde Redis si existe

    qs = Grade.objects.filter(
        alumno__grado_id=grado_id,
        evaluacion__periodo_id=periodo_id
    ).values("materia__nombre").annotate(
        promedio=Avg("valor"),
        aprobados=Count("id", filter=Q(valor__gte=6)),
        reprobados=Count("id", filter=Q(valor__lt=6))
    )

    df = pd.DataFrame(list(qs))
    df["percentil"] = df["promedio"].rank(pct=True) * 100
    df["estado"] = df["promedio"].apply(
        lambda x: "Crítico" if x < 5 else "Regular" if x < 7 else "Bueno"
    )

    result = df.to_dict(orient="records")
    cache.set(cache_key, result, timeout=3600)  # Cache 1 hora en Redis
    return result
```

---

## 6. Modelo de Datos — PostgreSQL v2.0

### 6.1 Entidades Principales

| Entidad | Tabla | Campos clave |
|---------|-------|-------------|
| Usuario | `users_user` | id, email, password_hash, role, tenant_id, is_active, last_login |
| Institución | `tenants_institution` | id (tenant_id), nombre, logo_url, config_json, created_at |
| Docente | `users_teacher` | user_id (FK), departamento, materias[], idioma, tenant_id |
| Alumno | `students_student` | id, nombre, apellido, fecha_nac, grado_id, seccion, tutor_id, tenant_id |
| Padre/Tutor | `users_parent` | user_id (FK), alumno_ids[] (FK), tenant_id |
| Grado | `academics_grade_level` | id, nombre, nivel, seccion, tenant_id |
| Materia | `academics_subject` | id, nombre, docente_id, grado_id, idioma, creditos, tenant_id |
| Período | `academics_period` | id, nombre, tipo, fecha_inicio, fecha_fin, tenant_id |
| Evaluación | `academics_evaluation` | id, tipo, materia_id, ponderacion, descripcion, periodo_id, tenant_id |
| Nota | `academics_note` | id, alumno_id, evaluacion_id, valor, timestamp_utc, sync_status, tenant_id |
| Asistencia | `academics_attendance` | id, alumno_id, fecha, estado, justificacion, sync_status, tenant_id |
| Socio-Afectivo | `academics_affective` | id, alumno_id, periodo_id, dimensiones (JSONB), observaciones, sync_status, tenant_id |
| Sync Queue | `sync_queue` | id, tabla, operacion, payload (JSONB), sync_status, created_at, resolved_at |
| Sync Conflicts | `sync_conflicts` | id, sync_queue_id, descripcion, payload_local, payload_server, resolved_by |

### 6.2 Campo tenant_id — Escalabilidad SaaS

- Un tenant = una institución educativa.
- Toda query lleva `filter(tenant_id=request.user.tenant_id)` automáticamente vía middleware.
- El Admin global puede ver todos los tenants. Cada institución solo ve sus datos.
- Preparado para facturación por institución en modelo SaaS futuro.

### 6.3 SQLite Local — Tauri (Offline)

| Tabla SQLite | Equivalente PostgreSQL | Campos adicionales offline |
|-------------|----------------------|---------------------------|
| `local_notes` | `academics_note` | local_id, sync_status, queued_at |
| `local_attendance` | `academics_attendance` | local_id, sync_status, queued_at |
| `local_affective` | `academics_affective` | local_id, sync_status, queued_at |
| `sync_queue` | `sync_queue` (server) | operacion, payload_json, intentos, ultimo_error |
| `cached_students` | `students_student` | cached_at, version — solo lectura offline |
| `cached_materias` | `academics_subject` | cached_at, version — solo lectura offline |

### 6.4 Campo sync_status

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Creado en SQLite offline, pendiente de envío al servidor |
| `SYNCING` | En proceso de envío — no modificar |
| `SYNCED` | Confirmado en PostgreSQL exitosamente |
| `CONFLICT` | Conflicto detectado, requiere resolución manual en `sync_conflicts` |

---

## 7. Especificación de Módulos

### 7.1 Auth y Roles

#### Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|---------|------|-------------|
| POST | `/api/auth/login/` | Público | Login → retorna access + refresh token JWT |
| POST | `/api/auth/refresh/` | Refresh token | Renueva access token expirado |
| POST | `/api/auth/logout/` | Token | Invalida refresh token en servidor |
| GET | `/api/auth/me/` | Token | Perfil, rol y tenant del usuario autenticado |

#### Reglas de Negocio

- Contraseña: mínimo 8 caracteres, 1 número, 1 mayúscula.
- Access token expira en 60 minutos. Refresh token en 7 días.
- 3 intentos fallidos → bloqueo de cuenta por 15 minutos.
- Login desde Tauri guarda token en almacenamiento seguro del SO (keychain/credential manager).

---

### 7.2 Notas y Promedios

#### Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|---------|------|-------------|
| GET | `/api/notas/{alumno_id}/` | Docente+ | Notas del alumno por período |
| POST | `/api/notas/` | Docente | Registrar nueva nota (online) |
| PUT | `/api/notas/{id}/` | Docente | Actualizar nota existente |
| DELETE | `/api/notas/{id}/` | Admin | Soft delete — solo Admin |
| GET | `/api/notas/promedio/{alumno_id}/{periodo}/` | Docente+ | Promedio calculado con Pandas |
| POST | `/api/sync/push/` | Docente | Endpoint sincronización offline → batch upload |

#### Lógica de Promedios con Pandas

- **Promedio simple:** `mean(notas)` por materia y período.
- **Promedio ponderado:** `sum(nota * ponderacion) / sum(ponderacion)` por tipo de evaluación.
- **Percentil:** `rank(pct=True)` del alumno dentro del grado.
- **Estado:** Crítico (< 5) / Regular (5–6.9) / Bueno (7–8.9) / Excelente (≥ 9).
- Nota mínima aprobatoria configurable por institución vía `tenant.config_json`.

---

### 7.3 Asistencia

#### Estados posibles

| Estado | Descripción |
|--------|-------------|
| `PRESENTE` | Alumno asistió puntualmente |
| `AUSENTE_JUSTIFICADO` | Falta con comprobante |
| `AUSENTE_INJUSTIFICADO` | Falta sin justificación |
| `TARDANZA` | Llegó con retraso (margen configurable en minutos) |

#### Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|---------|------|-------------|
| POST | `/api/asistencia/batch/` | Docente | Registrar asistencia de aula completa |
| GET | `/api/asistencia/{alumno_id}/` | Docente+ | Historial completo por alumno |
| PATCH | `/api/asistencia/{id}/justificar/` | Docente | Agregar justificación a ausencia |
| GET | `/api/asistencia/resumen/{grado_id}/` | Directivo | Reporte de asistencia por grado |

---

### 7.4 Socio-Afectivo

#### Dimensiones evaluadas

- Convivencia y respeto hacia compañeros y docentes.
- Participación e iniciativa en clase.
- Responsabilidad y cumplimiento de tareas.
- Regulación emocional y resolución de conflictos.
- Trabajo en equipo y colaboración.

#### Escala de calificación

`MB` (Muy Bien) / `B` (Bien) / `R` (Regular) / `I` (Insuficiente)

Almacenado como JSONB: `{ "convivencia": "MB", "participacion": "B", "responsabilidad": "R", ... }`

---

### 7.5 Boletín de Calificaciones PDF

#### Contenido del boletín

- Encabezado: logo institucional, nombre del colegio, período, fecha de emisión.
- Datos del alumno: nombre completo, grado, sección, docente tutor.
- Tabla de notas: materia → evaluaciones → promedio → estado (aprobado/reprobado).
- Resumen de asistencia: presentes, ausencias justificadas, injustificadas, tardanzas.
- Evaluación socio-afectiva: tabla de dimensiones con calificación.
- Observaciones generales del docente (campo libre).
- Firma digital del docente y sello institucional.

#### Endpoints

| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/api/boletin/{alumno_id}/{periodo_id}/` | Genera PDF individual |
| GET | `/api/boletin/batch/{grado_id}/{periodo_id}/` | Genera PDFs de todo el grado (tarea Celery) |
| GET | `/api/boletin/status/{task_id}/` | Estado de tarea batch: PENDING / READY / ERROR |

---

## 8. Roles y Permisos

| Módulo | Admin | Directivo | Docente | Padre | Enfermería | Chatbot |
|--------|-------|----------|---------|-------|-----------|---------|
| Auth / Usuarios | CRUD | Read | Self | Self | Self | — |
| Notas | CRUD | Read | CRUD | Read | — | Read |
| Asistencia | CRUD | Read | CRUD | Read | — | Read |
| Socio-Afectivo | CRUD | Read | CRUD | Read | — | — |
| Boletines | CRUD | Read | Generar | Read | — | — |
| Analíticas | Full | Institución | Su grado | Su hijo | — | — |
| Sync Offline | Full | — | Push | — | — | — |
| Enfermería | CRUD | Read | — | — | CRUD | — |
| Chatbot IA | Config | Uso | Uso | Uso | Uso | API |

> **Principio:** menor privilegio siempre. `tenant_id` validado en cada request via middleware.

---

## 9. Plan de Desarrollo por Fases

| Fase | Nombre | Alcance | Duración | Prioridad |
|------|--------|---------|----------|-----------|
| 1 | Core Backend + Auth | Django setup, PostgreSQL, Auth JWT, modelos con tenant_id, Docentes, Alumnos, Materias, CRUD Notas, Asistencia, Socio-Afectivo | 5 semanas | 🔴 CRÍTICA |
| 2 | Tauri Desktop | App Tauri multiplataforma, SQLite local, Sync Engine Rust, Tauri commands, Auto-updater, Build Win/Mac/Linux | 4 semanas | 🔴 CRÍTICA |
| 3 | Portal Web + Boletines | React PWA portal padres, visualización progreso, boletines PDF WeasyPrint, promedios Pandas, Celery batch | 4 semanas | 🟠 ALTA |
| 4 | Dashboard Analíticas | Python/Pandas analytics engine, Redis cache, 6 gráficos Recharts por grado, 6 por alumno, CalendarHeatmap | 4 semanas | 🟠 ALTA |
| 5 | Admin + Reportes | Panel directivos, gestión usuarios, Django Admin personalizado, reportes institucionales exportables | 3 semanas | 🟡 MEDIA |
| 6 | Módulo Enfermería | Historial médico, registro incidencias, alertas a padres, rol enfermería | 3 semanas | 🟡 MEDIA |
| 7 | Chatbot IA | Integración Claude/OpenAI API, consultas en lenguaje natural, módulo desacoplado plug-and-play | 4 semanas | 🟢 FUTURA |
| 8 | SaaS Multi-tenant | Panel super-admin, onboarding por institución, facturación por tenant, subdominios | 6 semanas | 🟢 FUTURA |

**Total estimado Fases 1–4 (MVP completo):** ~17 semanas

---

## 10. Requerimientos No Funcionales

### 10.1 Rendimiento

- API REST < 200ms para CRUD estándar.
- Analytics con Redis cache < 50ms en hit, < 2s en miss.
- Dashboard carga < 2s en conexión 3G.
- Boletín PDF individual < 5 segundos.
- Batch boletines (40 alumnos) < 60 segundos via Celery.
- Sync offline → online < 3s para cola de hasta 200 registros.
- Tauri app: arranque < 1.5s en hardware de gama media.

### 10.2 Seguridad

- HTTPS obligatorio en producción (TLS 1.3).
- Contraseñas hasheadas con bcrypt (cost factor 12).
- JWT RS256, access token 60min, refresh 7 días.
- Rate limiting: 100 req/min por IP en endpoints públicos.
- Sanitización: prevención SQL Injection y XSS en todos los inputs.
- Datos de alumnos nunca expuestos en logs del sistema.
- Token Tauri almacenado en keychain del SO (nunca en disco plano).
- `tenant_id` validado en middleware — un tenant nunca ve datos de otro.

### 10.3 Disponibilidad y Offline

- Uptime web target: 99.5% mensual.
- Modo offline del ejecutable Tauri: 100% funcional sin red.
- Backup automático PostgreSQL cada 24h con retención de 30 días.
- RTO (Recovery Time Objective): < 4 horas ante falla total del servidor.
- La caída del servidor NO interrumpe el trabajo del docente en ningún momento.

### 10.4 Usabilidad

- Interfaz 100% responsiva: desktop, tablet y móvil.
- Animaciones Framer Motion: transiciones < 300ms.
- Indicador visual de estado ONLINE / OFFLINE / SYNCING en tiempo real.
- Tema claro y oscuro disponible en todas las vistas.
- Soporte bilingüe: español e inglés (`react-i18next`).
- Accesibilidad WCAG 2.1 AA: contraste, teclado, labels ARIA.

---

## 11. Instrucciones para el Agente IA

### 11.1 Principios Fundamentales

1. Este documento es la **fuente única de verdad**. Toda decisión de arquitectura se basa en él.
2. Nunca instalar dependencias no listadas en la Sección 3 sin documentar la justificación.
3. Todo modelo Django debe incluir `tenant_id` desde su creación.
4. Toda operación de escritura debe tener su equivalente offline en SQLite/Tauri.
5. No usar `any` en TypeScript. Tipado estricto obligatorio en todo el frontend.
6. Cada función nueva incluye docstring en español con parámetros y retorno.
7. Cobertura de tests mínima: 80% backend, 70% frontend.

### 11.2 Convenciones de Código

#### Backend Django

- Apps: `core/`, `users/`, `academics/`, `sync/`, `analytics/`, `reports/`, `notifications/`, `tenants/`
- `snake_case` para modelos, funciones, variables Python.
- Serializers: siempre `ModelSerializer` con validaciones explícitas.
- Views: preferir `ViewSet`. Evitar vistas de función salvo casos triviales.
- Analytics: toda lógica Pandas en `analytics/services.py` — nunca en views.
- Cache: siempre usar `cache_key` con `tenant_id` incluido para evitar colisiones entre instituciones.
- Migraciones: nunca editar migraciones existentes. Solo nuevas.

#### Frontend React + TypeScript

- Estructura: `/components`, `/pages`, `/hooks`, `/store`, `/services`, `/types`, `/utils`, `/analytics`
- `PascalCase` para componentes. `camelCase` para hooks, utils y servicios.
- Zustand para estado global de sesión y datos offline.
- React Query para cache y sincronización de datos del servidor.
- Formularios: React Hook Form + Zod. Sin controlled inputs manuales.
- Gráficos: **solo Recharts**. No mezclar con Chart.js ni D3 directo.
- Animaciones: **solo Framer Motion**. Nunca CSS keyframes manuales.

#### Tauri / Rust

- Toda lógica de red y sync en `src-tauri/src/sync.rs`.
- Todo acceso a SQLite en `src-tauri/src/db.rs`.
- Los Tauri commands son la única interfaz entre Rust y React.
- Manejo de errores: siempre `Result<T, String>` para compatibilidad con Tauri.

### 11.3 Flujo de Trabajo del Agente

1. Leer secciones 2 (Arquitectura), 3 (Stack) y 6 (Modelo de Datos) antes de generar código.
2. Verificar módulo objetivo en Sección 7 para endpoints y reglas de negocio.
3. Respetar nombres de tablas exactos de la Sección 6 sin modificarlos.
4. Para analíticas: seguir siempre el flujo `PostgreSQL → Pandas → Redis → JSON → Recharts`.
5. Para código Tauri: siempre agregar el command en `commands.rs` y registrarlo en `main.rs`.
6. Ante duda de permisos: consultar tabla de Sección 8. Principio de menor privilegio.
7. Todo PR debe pasar linting (`flake8` + `black` para Python, `ESLint` + `Prettier` para TS).

### 11.4 Criterios de Aceptación

| Módulo | Criterio | Test requerido |
|--------|---------|---------------|
| Auth | Login retorna JWT válido < 1s. Bloqueo tras 3 intentos. | Unit + Integration |
| Notas + Promedios | Promedio Pandas coincide con fórmula de ponderación configurada. | Unit con datos reales |
| Offline Sync | Cola SQLite sincroniza sin pérdida de datos al reconectar. | Integration E2E |
| Conflictos Sync | Conflicto detectado queda en sync_conflicts, ningún dato se pierde. | Unit + Integration |
| Tauri Build | App compila y ejecuta en Windows 10+, macOS 12+, Ubuntu 22+. | CI/CD GitHub Actions |
| Analytics Grado | Dashboard carga < 2s con Redis cache. Gráficos renderizan correctamente. | Performance + Visual |
| Analytics Alumno | Padre solo ve datos de sus hijos. Nunca datos de otros alumnos. | Security + Integration |
| Boletín PDF | PDF contiene todos los campos, legible, < 500KB por alumno. | Unit + Visual |
| Multi-tenant | tenant_id validado en cada request. Institución A nunca accede a datos de B. | Security |

---

## 12. Estructura de Repositorio

```
edumanager-pro/                     ← Raíz del monorepo
│
├── backend/                        ← Proyecto Django — API REST central
│   ├── core/                       ← Settings, URLs base, middleware tenant
│   ├── users/                      ← Auth, roles, JWT, perfiles por rol
│   ├── tenants/                    ← Modelo Institución, middleware tenant_id
│   ├── academics/                  ← Notas, Asistencia, Socio-Afectivo, Boletines
│   ├── analytics/                  ← Services Pandas, endpoints Recharts, cache Redis
│   ├── sync/                       ← API sync offline, resolución conflictos, Celery tasks
│   ├── reports/                    ← Generación PDF WeasyPrint, templates HTML boletines
│   ├── notifications/              ← Alertas, emails, notificaciones push
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/                       ← React + TypeScript (compartido Tauri + Web)
│   └── src/
│       ├── components/             ← UI reutilizable: botones, tablas, formularios
│       ├── pages/                  ← Login, Dashboard, Notas, Asistencia, Analíticas
│       ├── analytics/              ← Componentes Recharts, hooks de métricas, Heatmap
│       ├── services/               ← API clients, SQLite offline, Tauri invoke wrappers
│       ├── store/                  ← Zustand: auth, offline queue, sync status
│       ├── hooks/                  ← Custom hooks reutilizables
│       ├── types/                  ← Tipos TypeScript del dominio académico
│       └── utils/                  ← Helpers, formatters, validators
│
├── src-tauri/                      ← Backend Rust — App de escritorio Tauri
│   ├── src/
│   │   ├── main.rs                 ← Entry point Tauri, registro de commands
│   │   ├── sync.rs                 ← Sync Engine: red, cola offline → API
│   │   ├── db.rs                   ← Operaciones SQLite
│   │   ├── commands.rs             ← Tauri commands expuestos al frontend
│   │   └── updater.rs              ← Auto-actualización
│   ├── tauri.conf.json             ← Config: permisos, ventanas, updater, iconos
│   └── Cargo.toml                  ← Dependencias Rust
│
├── .github/
│   └── workflows/
│       ├── test.yml                ← CI: tests + linting backend y frontend
│       └── release.yml             ← CD: build Tauri Win/Mac/Linux en push a main
│
├── docker-compose.yml              ← Django + PostgreSQL + Redis + Nginx + Celery
├── .env.example                    ← Variables de entorno documentadas
└── agent.md                        ← Este documento
```

---

## 13. Mapa de Escalabilidad

| Escenario | Escala | Acción requerida |
|-----------|--------|-----------------|
| 1 colegio, 50 doc, 1500 alumnos | ✅ Sin cambios | Arquitectura actual cubre este escenario completamente |
| 2–3 colegios, ~150 docentes | ✅ Escala | Activar tenant_id (ya incluido en v2.0). Subdominio por colegio. |
| 10+ colegios (SaaS) | ⚠ Ajuste | Panel super-admin, onboarding automatizado, facturación por tenant. |
| 10,000+ alumnos | ✅ Escala | Réplicas de lectura PostgreSQL. Redis cluster. Más workers Celery. |
| Alta concurrencia web | ✅ Escala | Más instancias Gunicorn + load balancer Nginx. |
| Distribución masiva ejecutable | ✅ Escala | Tauri auto-updater configurado. GitHub Actions distribuye automáticamente. |
| Analytics con millones de registros | ⚠ Ajuste | Tablas de agregación precalculadas. TimescaleDB para series temporales. |

---

## 14. Glosario

| Término | Definición |
|---------|-----------|
| **SDD** | Spec-Driven Development — el documento de especificación guía 100% del desarrollo. |
| **Tauri** | Framework multiplataforma para apps de escritorio usando Rust + webview nativo del SO. |
| **SQLite** | Base de datos embebida en el ejecutable Tauri para operación offline. |
| **Sync Engine** | Módulo Rust en Tauri que detecta red y sincroniza la cola offline con PostgreSQL. |
| **PWA** | Progressive Web App — portal web con cache offline básico, instalable desde navegador. |
| **Pandas** | Librería Python para análisis de datos: promedios, percentiles, tablas pivot. |
| **Recharts** | Librería React para gráficos interactivos: BarChart, LineChart, RadarChart, etc. |
| **Redis** | Base de datos en memoria usada como cache de métricas analíticas y broker Celery. |
| **Celery** | Sistema de colas para tareas asíncronas: batch boletines, sync masiva, emails. |
| **tenant_id** | Identificador de institución en todos los modelos. Permite multi-tenancy SaaS. |
| **sync_status** | Estado de sincronización: `PENDING` / `SYNCING` / `SYNCED` / `CONFLICT`. |
| **WeasyPrint** | Librería Python para generar PDFs desde HTML + CSS. Usada para boletines. |
| **Rango Socio-Afectivo** | Evaluación cualitativa del desarrollo emocional, social y actitudinal del alumno. |
| **CalendarHeatmap** | Visualización de asistencia en formato de calendario tipo GitHub contributions. |
| **DRF** | Django REST Framework — toolkit para APIs RESTful con Django. |
| **JWT** | JSON Web Token — autenticación stateless con tokens firmados RS256. |
| **JSONB** | Tipo de dato PostgreSQL para almacenar JSON con indexación eficiente. |

---

*EduManager Pro — SDD v2.0.0 | DevStudio.py} | Ing. Rolando Fariña | Junio 2026*
*Documento confidencial. Prohibida su reproducción sin autorización.*

# Agregar funcionalidades a la app
## Profesores
Profesor se registra en la app. Registra su correo/crea contraseña/ carga notas de los alumnos y procesos/evaluacion por fechas. mantiene registro de procesos por fechas.

## profesor carga rasgos socioafectivos/ Responsabilidad y Conducta.

## Rasgos socioafectivos representan el 10 porciento de la nota final.

## Procesos representan el 70 porciento de la nota final.Evaluacion y valoraciones un 30 porciento de la nota final

# Dividir accesos para docentes area español y docentes area ingles en 2 semenestres para cada uno.

## Año lectivo desde febrero a Noviembre. Diciembre y febrero examenes complementarios.

## Dividir por ciclos: Nivel inicial desde kinder 3 kinder 5. Primer ciclo de primer grado a tercer grado. segundo ciclo de 4to a 6to grado. Tercer ciclo de 7mo a 9no. Nivel medio de 1ero a 3ero de la media = para español. Paara ingles desde kinder 3 a 12th grade.

## Crear base de datos para materias en español e ingles. Para ingles= Math, Language Arts, Social studies, Science, Steam, Visual Arts, Technology para primaria. Para ingles desde 7mo a 9no = wordl history, english language arts, science, technology.10th to 12th = literure, academic writing, world history, economics, biology, driving education, psycology. 

---

## 15. Actualizaciones Recientes (Iteración Fases 13-16)

A continuación se documentan las expansiones y optimizaciones clave del sistema correspondientes al cierre de las fases operativas más recientes:

### 15.1 Refactorización UI/UX Docente y Omnibar (Fases 13 y 14)
- **Dashboard Docente Simplificado**: Se rediseñó la experiencia del usuario (docente) para centrarse en acciones directas (Libro de Calificaciones, Calendario de Evaluaciones, Analíticas). Se ocultaron vistas irrelevantes para este rol y se rediseñaron los iconos y descripciones.
- **Omnibar Interactivo**: Se reemplazó la barra de búsqueda estática del Header por una "Paleta de Comandos" global (Omnibar) activada al teclear `/`.
  - **Comandos Soportados**: 
    - `/calificar` → Navega directamente al Gradebook.
    - `/aviso` → Navega al Home y despliega el Modal de Creación de Anuncios automáticamente.
    - `/falta <nombre>` → Busca un alumno en tiempo real por nombre/apellido vía `SearchFilter` de Django y, al seleccionarlo, registra una inasistencia para el día actual sin recargar la página.

### 15.2 Modo Excel y Optimización Arquitectónica (Fase 15)
- **Navegación en Grilla (Gradebook)**: Se integró una matriz bidimensional de referencias (React Refs) que permite a los docentes moverse por la planilla de calificaciones usando únicamente las flechas del teclado (Modo Excel), acelerando dramáticamente el data entry.
- **Optimización de Carga (Backend)**: Se instaló la librería `django-filter` y se aplicó el `DjangoFilterBackend` al `NoteViewSet`. Esto permite consultar la API enviando los parámetros `?evaluacion__materia=X&evaluacion__periodo=Y`. Evita el patrón "Data Dumping" (descargar miles de notas a la vez) y previene la caída del servidor o saturación de RAM en el cliente al escalar el número de datos.
- **Memoria Contextual (Local Storage)**: Los selectores de Grado, Materia y Período ahora conservan el estado entre sesiones gracias a `localStorage`. El docente retoma el flujo de trabajo exactamente donde lo dejó la última vez.

### 15.3 Codificación Alfanumérica de Materias y Grados (Fase 16)
- **Base de Datos**: Se expandieron los modelos `GradeLevel` y `Subject` en `academics/models.py` para incluir el campo `codigo` (alfa-numérico de hasta 20 caracteres), permitiendo identificadores únicos por institución.
- **Soporte de Búsqueda API**: Se agregó `filters.SearchFilter` a los viewsets correspondientes, permitiendo búsquedas dinámicas por este código.
- **Frontend Formatter**: En todas las vistas críticas (`Gradebook`, `EvaluationCalendar`, etc.), la interfaz renderiza los elementos en el formato `[Código] - [Nombre]` en caso de que exista un código, organizando visualmente los menús desplegables para mayor eficiencia (Ej: `01 - Guaraní`, `02 - Lengua Castellana`).
