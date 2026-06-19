import logging
from typing import Dict, Any, List
from django.db.models import Avg, Count, Q
from django.utils import timezone
from academics.models import Note, GradeLevel, Attendance, Affective

logger = logging.getLogger(__name__)

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logger.warning("Pandas is not installed. Analytics will return mock data.")


def get_letter_grade(score: float, language: str = 'es') -> str:
    if language == 'INGLES':
        if score >= 9: return 'A'
        if score >= 8: return 'B'
        if score >= 7: return 'C'
        if score >= 6: return 'D'
        return 'F'
    else:
        if score >= 9: return 'E'
        if score >= 8: return 'MB'
        if score >= 7: return 'B'
        if score >= 6: return 'A'
        return 'I'


def calculate_student_averages(alumno_id: int, periodo_id: int) -> list:
    """
    Calcula el promedio ponderado por materia:
      - PROCESO    → peso configurado en Evaluation.ponderacion
      - EVALUACION → peso configurado en Evaluation.ponderacion
      - SOCIOAFECTIVO → excluido del promedio numérico (se muestra separado)

    Retorna una lista de dicts con:
      materia, idioma, promedio_proceso, promedio_evaluacion,
      promedio_final, calificacion_cualitativa
    """
    qs = Note.objects.filter(
        alumno_id=alumno_id,
        evaluacion__periodo_id=periodo_id
    ).exclude(
        evaluacion__tipo='SOCIOAFECTIVO'
    ).values(
        'evaluacion__materia_id',
        'evaluacion__materia__nombre',
        'evaluacion__materia__idioma',
        'evaluacion__tipo',
        'evaluacion__ponderacion',
        'valor'
    )

    if not qs.exists():
        return []

    if not PANDAS_AVAILABLE:
        return []

    df = pd.DataFrame(list(qs))
    df['valor'] = df['valor'].astype(float)
    df['ponderacion'] = df['evaluacion__ponderacion'].astype(float)

    results = []
    for materia_id, group in df.groupby('evaluacion__materia_id'):
        materia_nombre = group['evaluacion__materia__nombre'].iloc[0]
        idioma = group['evaluacion__materia__idioma'].iloc[0]

        procesos = group[group['evaluacion__tipo'] == 'PROCESO']
        evaluaciones = group[group['evaluacion__tipo'] == 'EVALUACION']

        avg_proceso = float(procesos['valor'].mean()) if not procesos.empty else None
        avg_evaluacion = float(evaluaciones['valor'].mean()) if not evaluaciones.empty else None

        # Calcular promedio final ponderado
        total_peso = 0.0
        suma_ponderada = 0.0

        if avg_proceso is not None:
            peso_proceso = float(procesos['ponderacion'].iloc[0]) / 100
            suma_ponderada += avg_proceso * peso_proceso
            total_peso += peso_proceso

        if avg_evaluacion is not None:
            peso_eval = float(evaluaciones['ponderacion'].iloc[0]) / 100
            suma_ponderada += avg_evaluacion * peso_eval
            total_peso += peso_eval

        if total_peso > 0:
            promedio_final = round(suma_ponderada / total_peso, 2)
        else:
            promedio_final = None

        results.append({
            'materia': materia_nombre,
            'materia_id': materia_id,
            'idioma': idioma,
            'promedio_proceso': round(avg_proceso, 2) if avg_proceso is not None else '-',
            'promedio_evaluacion': round(avg_evaluacion, 2) if avg_evaluacion is not None else '-',
            'promedio': promedio_final if promedio_final is not None else 0,
            'calificacion_cualitativa': get_letter_grade(promedio_final, idioma) if promedio_final is not None else '-',
        })

    return results


def get_student_attendance_summary(alumno_id: int, periodo=None) -> dict:
    """Retorna resumen de asistencia: presentes, ausentes, tardanzas."""
    qs = Attendance.objects.filter(alumno_id=alumno_id)
    if periodo:
        qs = qs.filter(fecha__gte=periodo.fecha_inicio, fecha__lte=periodo.fecha_fin)

    total = qs.count()
    presentes = qs.filter(estado='PRESENTE').count()
    ausentes_inj = qs.filter(estado='AUSENTE_INJUSTIFICADO').count()
    ausentes_just = qs.filter(estado='AUSENTE_JUSTIFICADO').count()
    tardanzas = qs.filter(estado='TARDANZA').count()

    return {
        'total_dias': total,
        'presentes': presentes,
        'ausentes_injustificados': ausentes_inj,
        'ausentes_justificados': ausentes_just,
        'tardanzas': tardanzas,
        'porcentaje_asistencia': round((presentes / total * 100), 1) if total > 0 else 100,
    }


def get_student_affective_records(alumno_id: int, periodo_id: int) -> list:
    """Retorna registros socioafectivos del alumno en el periodo."""
    records = Affective.objects.filter(
        alumno_id=alumno_id,
        periodo_id=periodo_id
    ).select_related('docente__user').order_by('-fecha_evaluacion')

    results = []
    for r in records:
        results.append({
            'fecha': r.fecha_evaluacion.strftime('%d/%m/%Y'),
            'docente': r.docente.user.get_full_name() if r.docente and r.docente.user else 'Docente',
            'dimensiones': r.dimensiones,
            'observaciones': r.observaciones or '',
        })
    return results


def get_grado_analytics(grado_id: int, periodo_id: int) -> dict:
    if not PANDAS_AVAILABLE:
        logger.error("Pandas no está instalado; no se pueden calcular analíticas de grado.")
        return {'subjects_avg': [], 'total_notes': 0}

    qs = Note.objects.filter(
        alumno__grado_id=grado_id,
        evaluacion__periodo_id=periodo_id
    ).values(
        'evaluacion__materia__nombre',
        'valor'
    )

    if not qs.exists():
        return {'subjects_avg': [], 'total_notes': 0}

    df = pd.DataFrame(list(qs))
    avg_df = df.groupby('evaluacion__materia__nombre')['valor'].mean().reset_index()
    avg_df.rename(columns={
        'evaluacion__materia__nombre': 'subject',
        'valor': 'score'
    }, inplace=True)
    avg_df['score'] = avg_df['score'].astype(float).round(2)

    return {
        'subjects_avg': avg_df.to_dict(orient='records'),
        'total_notes': len(df)
    }


def get_students_at_risk(tenant_id: int) -> list:
    # all_objects + filtro explícito: la función recibe tenant_id, así que no
    # debe depender del contexto del request (TenantManager es fail-closed).
    qs = Note.all_objects.filter(alumno__tenant_id=tenant_id)\
        .values('alumno_id', 'alumno__nombre', 'alumno__apellido', 'alumno__grado__nombre')\
        .annotate(promedio=Avg('valor'))\
        .filter(promedio__lt=7)\
        .order_by('promedio')

    return list(qs)


def get_missing_assignments(tenant_id: int) -> list:
    qs = Note.all_objects.filter(alumno__tenant_id=tenant_id, valor=0, evaluacion__tipo='PROCESO')\
        .values('alumno_id', 'alumno__nombre', 'alumno__apellido', 'evaluacion__materia__nombre', 'evaluacion__descripcion')\
        .distinct()

    return list(qs)


def get_live_boletin(alumno_id: int, periodo_id: int) -> dict:
    """
    Consolida en tiempo real todos los datos académicos de un alumno.
    Llamado tanto por docentes (ReportCards) como por padres (StudentProgress).
    La respuesta se cachea 5 min y se invalida cuando se guardan notas/asistencia/RSA.
    """
    from django.utils import timezone as tz
    from academics.models import Student, Period

    alumno = Student.objects.select_related('grado').get(id=alumno_id)
    periodo = Period.objects.get(id=periodo_id)

    # ── Notas por materia con detalle individual ──────────────────────────────
    notes_qs = Note.objects.filter(
        alumno_id=alumno_id,
        evaluacion__periodo_id=periodo_id,
    ).exclude(
        evaluacion__tipo='SOCIOAFECTIVO'
    ).select_related(
        'evaluacion', 'evaluacion__materia'
    ).order_by('evaluacion__materia__nombre', 'evaluacion__tipo', 'evaluacion__fecha')

    # Agrupar notas por materia
    materias_dict: Dict[int, Any] = {}
    for note in notes_qs:
        ev = note.evaluacion
        mid = ev.materia_id
        if mid not in materias_dict:
            materias_dict[mid] = {
                'nombre': ev.materia.nombre,
                'idioma': ev.materia.idioma,
                'notas': [],
                'peso_proceso': None,
                'peso_evaluacion': None,
            }
        materias_dict[mid]['notas'].append({
            'tipo': ev.tipo,
            'descripcion': ev.descripcion,
            'valor': float(note.valor),
            'fecha': ev.fecha.strftime('%d/%m/%Y') if ev.fecha else '',
            'ponderacion': float(ev.ponderacion),
        })
        if ev.tipo == 'PROCESO' and materias_dict[mid]['peso_proceso'] is None:
            materias_dict[mid]['peso_proceso'] = float(ev.ponderacion)
        elif ev.tipo == 'EVALUACION' and materias_dict[mid]['peso_evaluacion'] is None:
            materias_dict[mid]['peso_evaluacion'] = float(ev.ponderacion)

    # Calcular promedios ponderados
    materias_result = []
    promedios_finales = []
    for mat in materias_dict.values():
        procesos = [n['valor'] for n in mat['notas'] if n['tipo'] == 'PROCESO']
        evaluaciones = [n['valor'] for n in mat['notas'] if n['tipo'] == 'EVALUACION']

        avg_proc = round(sum(procesos) / len(procesos), 2) if procesos else None
        avg_eval = round(sum(evaluaciones) / len(evaluaciones), 2) if evaluaciones else None

        peso_p = (mat['peso_proceso'] or 70) / 100
        peso_e = (mat['peso_evaluacion'] or 30) / 100

        total_peso = ((peso_p if avg_proc is not None else 0) +
                      (peso_e if avg_eval is not None else 0))
        suma = (((avg_proc or 0) * (peso_p if avg_proc is not None else 0)) +
                ((avg_eval or 0) * (peso_e if avg_eval is not None else 0)))

        promedio_final = round(suma / total_peso, 2) if total_peso > 0 else None
        if promedio_final is not None:
            promedios_finales.append(promedio_final)

        idioma = mat['idioma']
        materias_result.append({
            'nombre': mat['nombre'],
            'idioma': idioma,
            'notas': mat['notas'],
            'promedio_proceso': avg_proc if avg_proc is not None else '-',
            'promedio_evaluacion': avg_eval if avg_eval is not None else '-',
            'promedio_final': promedio_final if promedio_final is not None else '-',
            'calificacion': get_letter_grade(promedio_final, idioma) if promedio_final is not None else '-',
        })

    # ── Asistencia del período ────────────────────────────────────────────────
    asistencia = get_student_attendance_summary(alumno_id, periodo=periodo)

    # ── RSA (registro más reciente del período) ───────────────────────────────
    rsa_qs = Affective.objects.filter(
        alumno_id=alumno_id, periodo_id=periodo_id
    ).order_by('-fecha_evaluacion')

    rsa = {'dimensiones': {}, 'observaciones': ''}
    if rsa_qs.exists():
        latest = rsa_qs.first()
        rsa = {'dimensiones': latest.dimensiones, 'observaciones': latest.observaciones or ''}

    promedio_general = (
        round(sum(promedios_finales) / len(promedios_finales), 2)
        if promedios_finales else None
    )

    # Estado: COMPLETO si hay notas en al menos una materia del grado
    total_materias_grado = alumno.grado.subjects.count() if alumno.grado else 0
    estado = 'COMPLETO' if len(materias_result) >= total_materias_grado > 0 else 'EN_PROGRESO'

    return {
        'alumno': {
            'id': alumno.id,
            'nombre': alumno.nombre,
            'apellido': alumno.apellido,
            'nombre_completo': f"{alumno.apellido}, {alumno.nombre}",
            'fecha_nac': alumno.fecha_nac.strftime('%d/%m/%Y'),
            'grado': alumno.grado.nombre if alumno.grado else '',
            'seccion': alumno.seccion,
            'ciclo': alumno.grado.get_ciclo_display() if alumno.grado else '',
            'idioma_seccion': alumno.grado.idioma_seccion if alumno.grado else 'ESPANOL',
        },
        'periodo': {
            'id': periodo.id,
            'nombre': periodo.nombre,
            'tipo': periodo.tipo,
            'fecha_inicio': str(periodo.fecha_inicio),
            'fecha_fin': str(periodo.fecha_fin),
            'anio_lectivo': periodo.fecha_inicio.year if periodo.fecha_inicio else tz.now().year,
        },
        'materias': materias_result,
        'asistencia': asistencia,
        'rsa': rsa,
        'promedio_general': promedio_general,
        'total_materias': len(materias_result),
        'estado': estado,
        'ultima_actualizacion': tz.now().isoformat(),
    }


def get_alerts(tenant_id: int) -> dict:
    """
    Agrupa todas las alertas relevantes del sistema:
    - Cumpleaños de hoy
    - Estudiantes en riesgo
    - Estudiantes con asistencia baja (< 85%)
    - Tareas faltantes
    """
    from datetime import timedelta
    from academics.models import Student

    today = timezone.now().date()

    def _edad(fecha_nac):
        return today.year - fecha_nac.year - (
            (today.month, today.day) < (fecha_nac.month, fecha_nac.day)
        )

    # ── Cumpleaños hoy + próximos 7 días en UNA sola consulta ──────────────────
    # Construimos los pares (mes, día) de hoy..+7 y filtramos con un OR.
    date_window = {today + timedelta(days=i): i for i in range(0, 8)}
    md_filter = Q()
    for d in date_window:
        md_filter |= Q(fecha_nac__month=d.month, fecha_nac__day=d.day)

    bday_students = Student.all_objects.filter(md_filter, tenant_id=tenant_id).select_related('grado')

    birthdays = []
    upcoming = []
    for s in bday_students:
        grado = s.grado.nombre if s.grado else ''
        # Encontrar el día de la ventana que coincide con este cumpleaños.
        for d, offset in date_window.items():
            if (s.fecha_nac.month, s.fecha_nac.day) == (d.month, d.day):
                if offset == 0:
                    birthdays.append({'nombre': f"{s.nombre} {s.apellido}", 'grado': grado, 'edad': _edad(s.fecha_nac)})
                else:
                    upcoming.append({
                        'nombre': f"{s.nombre} {s.apellido}", 'grado': grado,
                        'dias_faltan': offset, 'fecha': d.strftime('%d/%m'),
                    })
                break

    # Estudiantes en riesgo
    at_risk = get_students_at_risk(tenant_id)

    # ── Baja asistencia (< 85% en los últimos 30 días) ─────────────────────────
    # Una sola consulta agregada por alumno en lugar de N consultas.
    thirty_days_ago = today - timedelta(days=30)
    attendance_stats = (
        Attendance.all_objects.filter(tenant_id=tenant_id, fecha__gte=thirty_days_ago)
        .values('alumno_id', 'alumno__nombre', 'alumno__apellido', 'alumno__grado__nombre')
        .annotate(
            total=Count('id'),
            presentes=Count('id', filter=Q(estado='PRESENTE')),
        )
        .filter(total__gte=5)
    )
    low_attendance = []
    for row in attendance_stats:
        pct = row['presentes'] / row['total'] * 100
        if pct < 85:
            low_attendance.append({
                'alumno_id': row['alumno_id'],
                'nombre': f"{row['alumno__nombre']} {row['alumno__apellido']}",
                'grado': row['alumno__grado__nombre'] or '',
                'porcentaje_asistencia': round(pct, 1),
            })
    low_attendance.sort(key=lambda r: r['porcentaje_asistencia'])

    return {
        'birthdays_today': birthdays,
        'birthdays_upcoming': upcoming,
        'at_risk': at_risk[:5],
        'low_attendance': low_attendance[:5],
        'total_alerts': len(birthdays) + len(at_risk) + len(low_attendance),
    }
