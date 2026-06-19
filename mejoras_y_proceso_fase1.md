# Documentación de la Implementación — Fase 1 (Core Backend + Auth)

Este documento detalla el proceso de implementación y las mejoras arquitectónicas realizadas durante el desarrollo de la **Fase 1 (Core Backend + Auth)** para **EduManager Pro v2.0**.

---

## 🚀 Proceso de Implementación

Hemos estructurado y desarrollado la base de la aplicación bajo el directorio `backend/` de la siguiente manera:

1. **Entorno Virtual e Instalación de Dependencias:**
   - Se configuró un entorno virtual aislado de Python (`.venv`).
   - Se definió e instaló las dependencias esenciales en [requirements.txt](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/requirements.txt): Django, Django REST Framework, SimpleJWT para autenticación, django-cors-headers y bcrypt.

2. **Proyecto Base (`core`):**
   - Configurado en [settings.py](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/core/settings.py).
   - Registra todos los submódulos, middleware, SimpleJWT con un tiempo de expiración de 60 minutos para el access token y 7 días para el refresh token, y CORS habilitado.

3. **Módulo de Tenants (`tenants`):**
   - Implementa la base del modelo multi-tenant (`Institution`).
   - Define un contexto de hilo/asíncrono seguro mediante `contextvars` para almacenar la institución activa ([utils.py](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/tenants/utils.py)).
   - Implementa `TenantModel` y `TenantManager` en [mixins.py](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/tenants/mixins.py) para filtrar automáticamente todas las consultas de la base de datos por el `tenant_id` activo.

4. **Módulo de Usuarios y Autenticación (`users`):**
   - Modifica el modelo de usuario por defecto heredando de `AbstractUser` para incluir roles (`ADMIN`, `DIRECTIVO`, `DOCENTE`, `PADRE`, `ENFERMERIA`) y su `tenant` correspondiente.
   - Crea perfiles vinculados para docentes (`Teacher`) y padres (`Parent`).
   - Sobrescribe la clase de obtención de tokens para inyectar claims personalizados (`role`, `tenant_id`, `email`) dentro del payload del JWT.
   - Implementa el endpoint `/api/auth/me/` para retornar los datos del perfil y roles asociados.

5. **Módulo Académico (`academics`):**
   - Define los modelos de datos especificados (`GradeLevel`, `Student`, `Subject`, `Period`, `Evaluation`, `Note`, `Attendance`, `Affective`) heredando de `TenantModel`.
   - Se han incorporado las ponderaciones y estados requeridos (ej. estados de asistencia: `PRESENTE`, `AUSENTE_JUSTIFICADO`, `AUSENTE_INJUSTIFICADO`, `TARDANZA`).
   - Registra la API REST con enrutamiento DRF en [urls.py](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/core/urls.py).

---

## 🛠 Mejoras Arquitectónicas e Implementadas

Durante el desarrollo, detectamos e implementamos varias mejoras críticas de seguridad y arquitectura que no estaban descritas de forma explícita o que corrían el riesgo de fallar bajo prácticas estándar:

### 1. Resolución del Gotcha de Querysets en DRF (`TenantViewMixin`)
- **Problema:** En Django REST Framework, definir un queryset estático a nivel de clase (ej. `queryset = Student.objects.all()`) hace que Django instancie la consulta una sola vez durante la carga del archivo. Esto significa que si no hay un tenant activo al levantar el servidor, la consulta se crea sin filtros y los posteriores clones heredan esa ausencia de filtros, rompiendo la protección de multi-tenant.
- **Solución:** Creamos una clase `TenantViewMixin` en [mixins.py](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/tenants/mixins.py) que sobrescribe el método `get_queryset()` de DRF para instanciar dinámicamente un nuevo QuerySet `model.objects.all()` en cada ciclo de petición HTTP. Esto garantiza que la consulta se filtre usando el contexto del usuario autenticado en tiempo de ejecución.

### 2. Política de Bloqueo tras 3 Intentos Fallidos (3-Strikes Lockout)
- **Problema:** Proteger los endpoints de autenticación contra ataques de fuerza bruta.
- **Solución:** En la vista [CustomTokenObtainPairView](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/users/views.py) implementamos una política de bloqueo reactiva utilizando la caché integrada de Django (que escala a Redis sin cambiar código). Si un usuario ingresa mal sus credenciales 3 veces consecutivas, su cuenta se bloquea por 15 minutos. Un login exitoso limpia el historial de intentos.

### 3. Delimitación de Visibilidad del Rol Padre
- **Problema:** Garantizar que un usuario con rol `PADRE` solo pueda acceder a información relacionada con sus hijos, evitando filtración de datos de otros alumnos.
- **Solución:** En los métodos `get_queryset()` de los ViewSets de alumnos, notas, materias, asistencias e indicadores socioafectivos, implementamos un filtrado automático:
  ```python
  if user.role == User.Roles.PADRE:
      return qs.filter(alumno__parents__user=user)
  ```
  Esto asegura un aislamiento perfecto de datos a nivel de base de datos.

### 4. Soporte para Carga en Lote de Asistencias (Batch Upload)
- **Problema:** Los docentes deben registrar la asistencia de toda una sección a la vez. Guardar alumno por alumno mediante solicitudes individuales es ineficiente.
- **Solución:** Agregamos una acción personalizada `batch` en `AttendanceViewSet` (`POST /api/asistencia/batch/`) que permite registrar la asistencia de una lista completa de alumnos en una sola transacción.

---

## 🧪 Validación y Pruebas Unitarias

Se escribió un set de pruebas de integración en [tests.py](file:///c:/Users/ASUS/Desktop/Schoolmanager/backend/academics/tests.py) para validar la robustez de los mecanismos:
* `test_tenant_isolation_student_list`: Comprueba que un docente del Colegio A no vea alumnos del Colegio B en las listas.
* `test_tenant_isolation_direct_access_protection`: Comprueba que intentar acceder directamente a los detalles de un alumno de otro tenant retorne `404 Not Found`.
* `test_parent_restricted_access`: Comprueba que un padre solo reciba las notas de sus hijos asociados.
* `test_login_lockout_policy`: Verifica que a los 3 intentos fallidos la API retorne `403 Forbidden`.
* `test_successful_auth_clears_attempts`: Comprueba que un login exitoso resetee el contador de intentos fallidos.

**Resultado de las pruebas:**
```bash
Creating test database for alias 'default'...
Found 5 test(s).
System check identified no issues (0 silenced).
.....
----------------------------------------------------------------------
Ran 5 tests in 10.659s

OK
Destroying test database for alias 'default'...
```
