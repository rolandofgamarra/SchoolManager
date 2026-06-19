# SchoolManager Pro — Auditoría Full-Stack y Correcciones

**Fecha:** Junio 2026
**Alcance:** Backend (Django 5 + DRF, multi-tenant), Frontend (React 19 / Vite / TS), QA y rendimiento
**Estado:** Todas las correcciones aplicadas y verificadas (8/8 tests backend, build frontend OK)

---

## Resumen ejecutivo

Se auditó la aplicación como ingeniero full-stack senior: se depuró, se corrieron pruebas QA,
y se identificaron y corrigieron vulnerabilidades de seguridad, bugs que rompían el build,
y cuellos de botella de rendimiento.

Hallazgos críticos confirmados con pruebas reproducibles (luego eliminadas):
1. **Fuga de datos entre colegios (tenants)** en todas las vistas que no usaban `TenantViewMixin`.
2. **Caché compartido entre colegios** (`cache_page` sin clave de tenant).
3. **El build del frontend estaba roto** (variable `token` inexistente + 17 errores de TypeScript).

---

## 🔴 Críticos

### 1. Aislamiento de tenants roto (fuga de datos entre colegios)

**Causa raíz.** `TenantMiddleware` resolvía el tenant desde `request.user`, pero el middleware
corre **antes** de que DRF autentique el JWT. Por eso `request.user` siempre era anónimo en el
middleware, el `tenant_id` quedaba en `None`, y `TenantManager` devolvía **todos los registros
de todos los colegios** en cualquier vista que no fuera un ViewSet con `TenantViewMixin`.
Además, el header `X-Tenant-ID` y el query param `?tenant_id` permitían suplantar otro colegio.

**Impacto.** Un usuario autenticado del Colegio A podía leer alumnos, libretas y estadísticas del
Colegio B. Confirmado: el dashboard de un admin con 0 alumnos devolvía los 7 alumnos de otro colegio.

**Corrección.**
- `tenants/middleware.py`: el tenant ahora se deriva del **claim `tenant_id` del JWT firmado**
  (validado con `JWTAuthentication`). El cliente no puede alterarlo.
- Se **eliminaron** los fallbacks por header `X-Tenant-ID` y query param (vectores de suplantación),
  tanto en el middleware como en `TenantViewMixin`.
- `tenants/mixins.py`: `TenantManager` ahora es **fail-closed**: si no hay tenant en contexto,
  devuelve `queryset.none()` en lugar de todos los registros.
- Las funciones que reciben `tenant_id` explícito (dashboard, alertas, en-riesgo) usan
  `Model.all_objects.filter(tenant_id=...)` para no depender del contexto.
- `reports/tasks.py`: la tarea Celery `generate_batch_boletines` ahora recibe `tenant_id` y fija
  el contexto manualmente (corre fuera de un request).

**Regresión cubierta por tests:** `test_x_tenant_id_header_is_ignored`,
`test_dashboard_stats_no_cross_tenant_leak`.

### 2. Caché con fuga entre colegios (`cache_page`)

**Causa raíz.** `analytics/views.py` usaba `@cache_page`, que indexa solo por URL. `dashboard/` y
`alerts/` no tienen parámetros → la respuesta del primer colegio se servía a todos por 5 minutos.
Además, en `StudentAnalyticsView` el control de propiedad (padre/hijo) estaba **dentro** de `get()`,
por lo que un hit de caché lo saltaba.

**Corrección.** Se reemplazó `cache_page` por caché manual con **clave por tenant**
(`dashboard_stats_{tenant_id}`, `alerts_{tenant_id}`, etc.). Los controles de acceso se movieron
**antes** de leer el caché.

### 3. `LocMemCache` con múltiples workers de Gunicorn

**Causa raíz.** El caché en memoria local no se comparte entre procesos. Con varios workers, el
**lockout de login** y la **invalidación de caché por signals** eran inconsistentes (cada worker
tenía su propia copia).

**Corrección.** `core/settings.py`: si existe `REDIS_URL`, se usa `RedisCache` (compartido entre
workers); si no, `LocMemCache` (solo dev). En producción `REDIS_URL` es obligatorio.

---

## 🟠 Altos

### 4. Build del frontend roto
- `pages/Analytics.tsx` usaba una variable `token` inexistente (debía ser `accessToken`):
  el código no compilaba y, en runtime, enviaba `Bearer undefined` → 401. **Corregido.**
- Error de tipos en `analytics/AttendanceHeatmap.tsx` (`tooltipDataAttrs` devolvía `null`).
  Ahora devuelve `{}`. **Corregido.**
- 13 símbolos sin uso (imports/variables) que bloqueaban el build con `noUnusedLocals`. **Removidos.**
- Resultado: `tsc -b` y `vite build` pasan en limpio.

### 5. URLs hardcodeadas a `http://localhost:8000`
39 ocurrencias en 14 archivos, a pesar de existir `API_BASE`/`VITE_API_URL`. La app empaquetada
(Tauri) o desplegada no apuntaba a ningún backend. **Corregido:** todas las llamadas pasan por
`${API_BASE}` y cada archivo importa `API_BASE` desde `lib/api`.

> Nota: durante la corrección se detectaron además **rutas de API que no coinciden** con el backend
> (ej. el frontend llama `/api/academics/grades/` pero el router expone `/api/grados/`). Quedan
> documentadas como pendiente funcional separado (requiere validar pantalla por pantalla con la app
> corriendo).

### 6. Dependencias de runtime no instaladas
`pandas`, `Pillow`, `whitenoise`, `celery`, `redis`, `weasyprint` no estaban instaladas en el venv;
`manage.py check` fallaba y, sin `pandas`, las analíticas devolvían **datos falsos** (ver #8).
Se instalaron `Pillow` y `whitenoise` para poder correr QA. **Acción pendiente del equipo:**
`pip install -r requirements.txt` completo en cada entorno.

### 7. Serializers sin validación de tenant en FKs cruzados
Los FKs hacia `Teacher`/`Parent` (app `users`, sin manager tenant-aware) permitían asignar un
docente o tutor de otro colegio. **Corrección:** nuevo `TenantPrimaryKeyRelatedField` que restringe
el queryset al tenant activo, aplicado a `tutor`, `docente` en los serializers correspondientes.
Además `batch_create` (asistencia) ahora **valida que los alumnos pertenezcan al tenant**, valida
el `estado` contra las choices y envuelve la escritura en `transaction.atomic()`.

### 8. Datos falsos (mock) filtrándose a respuestas reales
`get_students_at_risk`, `get_missing_assignments` y `get_grado_analytics` devolvían alumnos
inventados ("Carlos Gómez", etc.) cuando la consulta real venía vacía. **Removidos**; ahora
devuelven listas vacías reales.

---

## 🟡 Medios

- **Lockout de login por usuario → DoS.** Antes, cualquiera podía bloquear la cuenta de otro
  fallando 3 veces con su usuario. Ahora la llave es `IP + usuario` (`users/views.py`).
- **`make_random_password()`** (removido en Django 5.1) reemplazado por `secrets.token_urlsafe`.
- **`SECRET_KEY` insegura por defecto.** En producción (`DEBUG=False`) ahora **falla al arrancar**
  si `DJANGO_SECRET_KEY` no está definida, evitando desplegar con la clave pública conocida.

---

## 🐢 Rendimiento

- **`get_alerts` (N+1 eliminado).** Antes iteraba todos los alumnos con una consulta de asistencia
  por cada uno, más 7 consultas separadas para cumpleaños próximos. Ahora:
  - Cumpleaños de hoy + próximos 7 días en **una sola consulta** (filtro `Q` sobre mes/día).
  - Baja asistencia con **una agregación** (`Count` + `filter`) en vez de N consultas.
  - Se corrigió además el cálculo de edad (antes ignoraba si el cumpleaños ya pasó en el año).

---

## Verificación

| Chequeo | Resultado |
|---|---|
| `manage.py check` | Sin issues |
| `makemigrations --check` | Sin cambios pendientes |
| Tests backend (`academics.tests`) | 8/8 OK (incluye 3 nuevos de regresión de tenant/caché/FK) |
| `tsc -b` (typecheck) | 0 errores |
| `vite build` | Build exitoso |

---

## Archivos modificados (principales)

**Backend:** `tenants/middleware.py`, `tenants/mixins.py`, `reports/tasks.py`,
`analytics/views.py`, `analytics/services.py`, `academics/views.py`, `academics/serializers.py`,
`users/views.py`, `core/settings.py`, `academics/tests.py`.

**Frontend:** `lib/api.ts` (uso), `pages/Analytics.tsx`, `analytics/AttendanceHeatmap.tsx`,
`components/Header.tsx`, `components/Sidebar.tsx`, `components/BoletinViewer.tsx`,
`pages/ClassManagement.tsx`, `pages/EvaluationCalendar.tsx`, `pages/Gradebook.tsx`,
`pages/ParentDashboard.tsx`, y otros 10 archivos por la migración de URLs a `API_BASE`.

---

## Pendientes recomendados (no bloqueantes)

1. Corregir las rutas de API del frontend que no coinciden con el backend (validar con la app viva).
2. Migrar de SQLite a PostgreSQL para soportar escritura concurrente real.
3. Implementar refresh automático del JWT en el frontend (hoy la sesión corta a los 60 min).
4. Mover el JWT de `localStorage` al secure store de Tauri (mitiga XSS).
