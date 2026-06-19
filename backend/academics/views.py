from rest_framework import viewsets, permissions, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from tenants.mixins import TenantViewMixin
from academics.models import (
    GradeLevel, Student, Subject, Period, Evaluation, Note, Attendance, Affective, AnnualPlan
)
from academics.serializers import (
    GradeLevelSerializer, StudentSerializer, SubjectSerializer, PeriodSerializer,
    EvaluationSerializer, NoteSerializer, AttendanceSerializer, AffectiveSerializer,
    AnnualPlanSerializer
)
from users.models import User

class AcademicsBasePermission(permissions.BasePermission):
    """
    Base permission class:
    - ADMIN: full access (CRUD).
    - DIRECTIVO: read-only access (safe methods).
    - ENFERMERIA: read-only access (for basic academic stuff).
    - Others: evaluated in sub-classes.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == User.Roles.ADMIN:
            return True
        if request.user.role == User.Roles.ENFERMERIA:
            return request.method in permissions.SAFE_METHODS
        return True


class GradeLevelPermission(AcademicsBasePermission):
    """
    Grades/Levels can only be edited by Admin.
    Docentes and Padres can read.
    """
    def has_permission(self, request, view):
        is_base_allowed = super().has_permission(request, view)
        if not is_base_allowed:
            return False
        if request.user.role == User.Roles.DOCENTE:
            return True # Docentes can do full CRUD on GradeLevels for their class
        if request.user.role == User.Roles.DIRECTIVO:
            return request.method in permissions.SAFE_METHODS
        if request.user.role == User.Roles.PADRE:
            return request.method in permissions.SAFE_METHODS
        return True


class StudentPermission(AcademicsBasePermission):
    """
    Students can only be created/edited/deleted by Admin.
    Docentes and Padres can read (Padres restricted to their kids in queryset).
    """
    def has_permission(self, request, view):
        is_base_allowed = super().has_permission(request, view)
        if not is_base_allowed:
            return False
        if request.user.role in [User.Roles.DOCENTE, User.Roles.DIRECTIVO]:
            return True # Both Docente and Directivo can manage Students
        if request.user.role == User.Roles.PADRE:
            return request.method in permissions.SAFE_METHODS
        return True


class SubjectPermission(AcademicsBasePermission):
    """
    Subjects can only be edited by Admin.
    Docentes can read. Padres can read.
    """
    def has_permission(self, request, view):
        is_base_allowed = super().has_permission(request, view)
        if not is_base_allowed:
            return False
        if request.user.role == User.Roles.DOCENTE:
            return True # Full CRUD for subjects
        if request.user.role == User.Roles.DIRECTIVO:
            return request.method in permissions.SAFE_METHODS
        if request.user.role == User.Roles.PADRE:
            return request.method in permissions.SAFE_METHODS
        return True


class PeriodPermission(AcademicsBasePermission):
    """
    Periods are managed by Admin. Read-only for others.
    """
    def has_permission(self, request, view):
        is_base_allowed = super().has_permission(request, view)
        if not is_base_allowed:
            return False
        if request.user.role in [User.Roles.DOCENTE, User.Roles.PADRE]:
            return request.method in permissions.SAFE_METHODS
        return True


class AcademicsTransactionalPermission(AcademicsBasePermission):
    """
    Permissions for transaction data: Notes, Attendance, Socio-Affective.
    - Admin: CRUD
    - Docente: CRUD
    - Directivo: Read-only
    - Padre: Read-only (filtered to their children in querysets)
    """
    def has_permission(self, request, view):
        is_base_allowed = super().has_permission(request, view)
        if not is_base_allowed:
            return False
        if request.user.role == User.Roles.DOCENTE:
            return True
        if request.user.role == User.Roles.PADRE:
            return request.method in permissions.SAFE_METHODS
        return False


# --- ViewSets ---

class GradeLevelViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = GradeLevel.objects.all()
    serializer_class = GradeLevelSerializer
    permission_classes = [GradeLevelPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['codigo', 'nombre']


class StudentViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = Student.objects.select_related('grado').all()
    serializer_class = StudentSerializer
    permission_classes = [StudentPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['grado']
    search_fields = ['nombre', 'apellido']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Roles.PADRE:
            return qs.filter(parents__user=user)
        return qs


class SubjectViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [SubjectPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['codigo', 'nombre']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Parent can only see subjects of their children's grades
        if user.role == User.Roles.PADRE:
            return qs.filter(grado__students__parents__user=user).distinct()
        return qs


class PeriodViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    permission_classes = [PeriodPermission]


class EvaluationViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    permission_classes = [AcademicsTransactionalPermission]


class NoteViewSet(TenantViewMixin, viewsets.ModelViewSet):
    # select_related elimina N+1 queries en el Gradebook (alumno, evaluacion, materia, periodo)
    queryset = Note.objects.select_related(
        'alumno', 'evaluacion', 'evaluacion__materia', 'evaluacion__periodo'
    ).all()
    serializer_class = NoteSerializer
    permission_classes = [AcademicsTransactionalPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alumno', 'evaluacion', 'evaluacion__materia', 'evaluacion__periodo']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Roles.PADRE:
            return qs.filter(alumno__parents__user=user)
        elif user.role == User.Roles.DOCENTE:
            if hasattr(user, 'teacher_profile'):
                return qs.filter(evaluacion__materia__docente=user.teacher_profile)
        return qs


class AttendanceViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('alumno', 'alumno__grado').all()
    serializer_class = AttendanceSerializer
    permission_classes = [AcademicsTransactionalPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alumno', 'fecha', 'estado']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Roles.PADRE:
            return qs.filter(alumno__parents__user=user)
        return qs

    @action(detail=False, methods=['post'], url_path='batch')
    def batch_create(self, request):
        """
        Guarda asistencia de toda una clase en una sola transacción.
        Payload: {"fecha": "YYYY-MM-DD", "records": [{"alumno": 1, "estado": "PRESENTE"}, ...]}
        Usa bulk_create: 1 INSERT en lugar de N INSERTs — crítico para 30-40 alumnos.
        Si ya existe registro para ese alumno+fecha, lo actualiza (update_or_create).
        """
        fecha = request.data.get('fecha')
        records = request.data.get('records', [])

        if not fecha or not records:
            return Response(
                {'detail': "Faltan parámetros 'fecha' o 'records'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = request.user.tenant
        valid_estados = set(Attendance.Estados.values)

        # Validar estados antes de tocar la base de datos.
        for rec in records:
            estado = rec.get('estado', 'PRESENTE')
            if estado not in valid_estados:
                return Response(
                    {'detail': f"Estado inválido: '{estado}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        requested_ids = {r.get('alumno') for r in records if r.get('alumno')}
        # Solo aceptar alumnos que pertenezcan al tenant (Student.objects es
        # tenant-aware). Esto evita registrar asistencia de otro colegio.
        valid_ids = set(
            Student.objects.filter(id__in=requested_ids).values_list('id', flat=True)
        )
        invalid_ids = requested_ids - valid_ids
        if invalid_ids:
            return Response(
                {'detail': f"Alumnos no encontrados en este colegio: {sorted(invalid_ids)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        to_create = []
        to_update_ids = []
        existing = {
            a.alumno_id: a
            for a in Attendance.objects.filter(alumno_id__in=valid_ids, fecha=fecha)
        }

        for rec in records:
            alumno_id = rec.get('alumno')
            if alumno_id not in valid_ids:
                continue
            estado = rec.get('estado', 'PRESENTE')
            justificacion = rec.get('justificacion', '')

            if alumno_id in existing:
                obj = existing[alumno_id]
                obj.estado = estado
                obj.justificacion = justificacion
                to_update_ids.append(obj)
            else:
                to_create.append(Attendance(
                    alumno_id=alumno_id,
                    fecha=fecha,
                    estado=estado,
                    justificacion=justificacion,
                    tenant=tenant,
                ))

        with transaction.atomic():
            if to_create:
                Attendance.objects.bulk_create(to_create)
            if to_update_ids:
                Attendance.objects.bulk_update(to_update_ids, ['estado', 'justificacion'])

        all_records = Attendance.objects.filter(alumno_id__in=valid_ids, fecha=fecha)
        serializer = AttendanceSerializer(all_records, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AffectiveViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = Affective.objects.all()
    serializer_class = AffectiveSerializer
    permission_classes = [AcademicsTransactionalPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Parents only see affective records for their children
        if user.role == User.Roles.PADRE:
            return qs.filter(alumno__parents__user=user)
        return qs

class AnnualPlanPermission(AcademicsBasePermission):
    """
    Annual Plans:
    - Admin, Docente: CRUD
    - Directivo, Padre: Read-only
    """
    def has_permission(self, request, view):
        is_base_allowed = super().has_permission(request, view)
        if not is_base_allowed:
            return False
        if request.user.role == User.Roles.DOCENTE:
            return True
        if request.user.role in [User.Roles.DIRECTIVO, User.Roles.PADRE]:
            return request.method in permissions.SAFE_METHODS
        return True

class AnnualPlanViewSet(TenantViewMixin, viewsets.ModelViewSet):
    queryset = AnnualPlan.objects.all()
    serializer_class = AnnualPlanSerializer
    permission_classes = [AnnualPlanPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filtro opcional por tipo en la URL
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            qs = qs.filter(tipo=tipo)

        user = self.request.user
        if user.role == User.Roles.DOCENTE:
            if hasattr(user, 'teacher_profile'):
                qs = qs.filter(docente=user.teacher_profile)
        return qs
