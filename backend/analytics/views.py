from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from django.core.cache import cache
from django.utils import timezone

from analytics.services import (
    get_grado_analytics, calculate_student_averages,
    get_students_at_risk, get_missing_assignments, get_alerts
)
from academics.models import Student, Subject, Period
from users.models import User, Teacher

# TTLs de caché (segundos)
TTL_DASHBOARD = 300
TTL_GRADE = 3600
TTL_STUDENT = 300
TTL_ALERTS = 300


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.user.tenant_id
        cache_key = f"dashboard_stats_{tenant_id}"
        data = cache.get(cache_key)
        if data is not None:
            return Response(data)

        # Filtramos explícitamente por tenant_id (en vez de confiar solo en el
        # contexto del TenantManager) para que el conteo sea correcto e
        # independiente de cómo se resolvió el tenant.
        current_month = timezone.now().month
        birthdays_qs = Student.all_objects.filter(
            tenant_id=tenant_id, fecha_nac__month=current_month
        ).select_related('grado')
        birthdays_list = [
            {
                'nombre': f"{s.nombre} {s.apellido}",
                'grado': s.grado.nombre if s.grado else "Sin grado",
                'dia': s.fecha_nac.day
            } for s in birthdays_qs
        ]

        data = {
            'total_students': Student.all_objects.filter(tenant_id=tenant_id).count(),
            'total_teachers': Teacher.objects.filter(tenant_id=tenant_id).count(),
            'total_subjects': Subject.all_objects.filter(tenant_id=tenant_id).count(),
            'total_periods': Period.all_objects.filter(tenant_id=tenant_id).count(),
            'birthdays': birthdays_list,
            'birthdays_count': len(birthdays_list)
        }
        cache.set(cache_key, data, TTL_DASHBOARD)
        return Response(data)


class GradeAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    def get(self, request, grado_id, periodo_id):
        if request.user.role == User.Roles.PADRE:
            return Response({'detail': 'Acceso denegado.'}, status=403)

        tenant_id = request.user.tenant_id
        cache_key = f"grade_analytics_{tenant_id}_{grado_id}_{periodo_id}"
        data = cache.get(cache_key)
        if data is None:
            data = get_grado_analytics(grado_id, periodo_id)
            cache.set(cache_key, data, TTL_GRADE)
        return Response(data)


class StudentAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    def get(self, request, alumno_id, periodo_id):
        user = request.user
        # La verificación de propiedad va ANTES de leer el caché para que un
        # hit de caché nunca saltee el control de acceso.
        if user.role == User.Roles.PADRE:
            if not Student.objects.filter(id=alumno_id, parents__user=user).exists():
                return Response(
                    {'detail': 'No tienes permiso para ver estas analíticas.'},
                    status=403
                )

        tenant_id = user.tenant_id
        cache_key = f"student_analytics_{tenant_id}_{alumno_id}_{periodo_id}"
        data = cache.get(cache_key)
        if data is None:
            data = calculate_student_averages(alumno_id, periodo_id)
            cache.set(cache_key, data, TTL_STUDENT)
        return Response({'averages': data})


class AtRiskStudentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == User.Roles.PADRE:
            return Response({'detail': 'Acceso denegado.'}, status=403)
        data = get_students_at_risk(user.tenant_id)
        return Response(data)


class MissingAssignmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == User.Roles.PADRE:
            return Response({'detail': 'Acceso denegado.'}, status=403)
        data = get_missing_assignments(user.tenant_id)
        return Response(data)


class AlertsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analytics'

    def get(self, request):
        user = request.user
        if user.role == User.Roles.PADRE:
            return Response({'detail': 'Acceso denegado.'}, status=403)

        tenant_id = user.tenant_id
        cache_key = f"alerts_{tenant_id}"
        data = cache.get(cache_key)
        if data is None:
            data = get_alerts(tenant_id)
            cache.set(cache_key, data, TTL_ALERTS)
        return Response(data)
