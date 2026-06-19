from rest_framework import serializers
from academics.models import (
    GradeLevel, Student, Subject, Period, Evaluation, Note, Attendance, Affective, AnnualPlan
)
from tenants.utils import get_current_tenant_id
from users.models import Teacher, Parent


class TenantPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """
    PrimaryKeyRelatedField que restringe el queryset al tenant activo.

    Necesario para FKs que apuntan a modelos del app `users` (Teacher, Parent),
    cuyo manager por defecto NO es tenant-aware. Sin esto, un colegio podría
    asignar un docente o tutor de otro colegio.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        tenant_id = get_current_tenant_id()
        if tenant_id is not None:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class GradeLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeLevel
        fields = ['id', 'codigo', 'nombre', 'nivel', 'seccion', 'ciclo', 'idioma_seccion', 'tenant']
        read_only_fields = ['id', 'tenant']


class StudentSerializer(serializers.ModelSerializer):
    grado_detail = GradeLevelSerializer(source='grado', read_only=True)
    tutor = TenantPrimaryKeyRelatedField(
        queryset=Parent.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Student
        fields = ['id', 'nombre', 'apellido', 'fecha_nac', 'grado', 'grado_detail', 'seccion', 'tutor', 'tenant']
        read_only_fields = ['id', 'tenant']


class SubjectSerializer(serializers.ModelSerializer):
    grado_detail = GradeLevelSerializer(source='grado', read_only=True)
    docente = TenantPrimaryKeyRelatedField(
        queryset=Teacher.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Subject
        fields = ['id', 'codigo', 'nombre', 'docente', 'grado', 'grado_detail', 'idioma', 'creditos', 'tenant']
        read_only_fields = ['id', 'tenant']


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = ['id', 'nombre', 'tipo', 'area', 'fecha_inicio', 'fecha_fin', 'tenant']
        read_only_fields = ['id', 'tenant']


class EvaluationSerializer(serializers.ModelSerializer):
    materia_detail = SubjectSerializer(source='materia', read_only=True)
    periodo_detail = PeriodSerializer(source='periodo', read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            'id', 'tipo', 'materia', 'materia_detail', 
            'ponderacion', 'descripcion', 'periodo', 'periodo_detail', 'fecha', 'tenant'
        ]
        read_only_fields = ['id', 'tenant']


class NoteSerializer(serializers.ModelSerializer):
    alumno_detail = StudentSerializer(source='alumno', read_only=True)
    evaluacion_detail = EvaluationSerializer(source='evaluacion', read_only=True)

    class Meta:
        model = Note
        fields = [
            'id', 'alumno', 'alumno_detail', 'evaluacion', 
            'evaluacion_detail', 'valor', 'timestamp_utc', 'sync_status', 'tenant'
        ]
        read_only_fields = ['id', 'timestamp_utc', 'tenant']


class AttendanceSerializer(serializers.ModelSerializer):
    alumno_detail = StudentSerializer(source='alumno', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'alumno', 'alumno_detail', 'fecha', 'estado', 'justificacion', 'sync_status', 'tenant']
        read_only_fields = ['id', 'tenant']


class AffectiveSerializer(serializers.ModelSerializer):
    alumno_detail = StudentSerializer(source='alumno', read_only=True)
    periodo_detail = PeriodSerializer(source='periodo', read_only=True)
    docente = TenantPrimaryKeyRelatedField(
        queryset=Teacher.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Affective
        fields = [
            'id', 'alumno', 'alumno_detail', 'periodo', 
            'periodo_detail', 'dimensiones', 'observaciones', 'sync_status', 'docente', 'fecha_evaluacion', 'tenant'
        ]
        read_only_fields = ['id', 'tenant']

class AnnualPlanSerializer(serializers.ModelSerializer):
    docente = TenantPrimaryKeyRelatedField(queryset=Teacher.objects.all())

    class Meta:
        model = AnnualPlan
        fields = '__all__'
        read_only_fields = ['id', 'tenant', 'fecha_subida']
