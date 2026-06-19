import datetime
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from academics.models import Student, Period
from analytics.services import get_live_boletin
from users.models import User

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


def _boletin_cache_key(tenant_id, alumno_id, periodo_id):
    return f"boletin_live_{tenant_id}_{alumno_id}_{periodo_id}"


class LiveBoletinView(APIView):
    """
    GET /api/reports/boletin/{alumno_id}/{periodo_id}/
    Devuelve la libreta en tiempo real como JSON.
    Cacheada 5 min por alumno+período; los signals la invalidan cuando cambian notas.
    Accesible para DOCENTE, ADMIN, DIRECTIVO y PADRE (solo sus hijos).
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reports'

    def get(self, request, alumno_id, periodo_id):
        alumno = get_object_or_404(Student, id=alumno_id)
        periodo = get_object_or_404(Period, id=periodo_id)
        user = request.user

        # Padres solo pueden ver la libreta de sus hijos
        if user.role == User.Roles.PADRE:
            if not Student.objects.filter(id=alumno_id, parents__user=user).exists():
                return Response({'detail': 'No tenés acceso a esta libreta.'}, status=403)

        tenant_id = getattr(alumno, 'tenant_id', None) or (user.tenant_id)
        cache_key = _boletin_cache_key(tenant_id, alumno_id, periodo_id)

        data = cache.get(cache_key)
        if data is None:
            data = get_live_boletin(alumno_id, periodo_id)
            cache.set(cache_key, data, timeout=300)  # 5 minutos

        return Response(data)


class BoletinPDFView(APIView):
    """
    GET /api/reports/boletin/{alumno_id}/{periodo_id}/pdf/
    Genera y descarga el PDF de la libreta.
    En Windows (sin WeasyPrint) devuelve el JSON con una nota explicativa.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reports'

    def get(self, request, alumno_id, periodo_id):
        alumno = get_object_or_404(Student, id=alumno_id)
        periodo = get_object_or_404(Period, id=periodo_id)
        user = request.user

        if user.role == User.Roles.PADRE:
            if not Student.objects.filter(id=alumno_id, parents__user=user).exists():
                return Response({'detail': 'No tenés acceso a esta libreta.'}, status=403)

        tenant_id = getattr(alumno, 'tenant_id', None) or user.tenant_id
        cache_key = _boletin_cache_key(tenant_id, alumno_id, periodo_id)

        data = cache.get(cache_key)
        if data is None:
            data = get_live_boletin(alumno_id, periodo_id)
            cache.set(cache_key, data, timeout=300)

        if not WEASYPRINT_AVAILABLE:
            return JsonResponse({
                **data,
                '_note': 'PDF requiere WeasyPrint (Linux/Docker). En Windows se devuelve JSON.',
            })

        # Construir context para la plantilla HTML → PDF
        context = {
            'alumno': alumno,
            'periodo': periodo,
            'periodo_nombre': periodo.nombre,
            'resultados': data['materias'],
            'asistencia': data['asistencia'],
            'dimensiones_rsa': data['rsa'].get('dimensiones', {}),
            'observaciones_rsa': data['rsa'].get('observaciones', ''),
            'promedio_general': data['promedio_general'],
            'fecha_emision': datetime.date.today().strftime('%d/%m/%Y'),
            'anio_lectivo': data['periodo']['anio_lectivo'],
        }

        html_string = render_to_string('reports/boletin.html', context)
        pdf_file = HTML(string=html_string).write_pdf()

        filename = f"libreta_{alumno.apellido}_{alumno.nombre}_{periodo.nombre}.pdf"
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ParentBoletinesView(APIView):
    """
    GET /api/reports/mis-boletines/?periodo_id=<id>
    Para padres: devuelve la libreta live de TODOS sus hijos en el período dado.
    Si no se pasa periodo_id, retorna la lista de hijos con los períodos disponibles.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Solo padres y admins pueden usar este endpoint
        if user.role not in [User.Roles.PADRE, User.Roles.ADMIN, User.Roles.DIRECTIVO]:
            return Response({'detail': 'Endpoint exclusivo para padres.'}, status=403)

        periodo_id = request.query_params.get('periodo_id')

        # Obtener hijos del padre
        if user.role == User.Roles.PADRE and hasattr(user, 'parent_profile'):
            hijos = user.parent_profile.students.select_related('grado').all()
        else:
            # Admin/Directivo: retorna vacío (usar otros endpoints)
            return Response({'hijos': [], 'periodos': []})

        if not periodo_id:
            # Retornar lista de hijos + períodos disponibles
            periodos = Period.objects.filter(tenant=user.tenant).order_by('-fecha_inicio')
            return Response({
                'hijos': [
                    {
                        'id': h.id,
                        'nombre': h.nombre,
                        'apellido': h.apellido,
                        'nombre_completo': f"{h.nombre} {h.apellido}",
                        'grado': h.grado.nombre if h.grado else '',
                        'seccion': h.seccion,
                    }
                    for h in hijos
                ],
                'periodos': [
                    {
                        'id': p.id,
                        'nombre': p.nombre,
                        'tipo': p.tipo,
                        'fecha_inicio': str(p.fecha_inicio),
                    }
                    for p in periodos
                ],
            })

        # Retornar libreta live de cada hijo para el período seleccionado
        periodo = get_object_or_404(Period, id=periodo_id)
        boletines = []
        for hijo in hijos:
            try:
                tenant_id = getattr(hijo, 'tenant_id', None) or user.tenant_id
                cache_key = _boletin_cache_key(tenant_id, hijo.id, periodo_id)
                data = cache.get(cache_key)
                if data is None:
                    data = get_live_boletin(hijo.id, int(periodo_id))
                    cache.set(cache_key, data, timeout=300)
                boletines.append(data)
            except Exception:
                pass

        return Response({'boletines': boletines, 'periodo': {'id': periodo.id, 'nombre': periodo.nombre}})
