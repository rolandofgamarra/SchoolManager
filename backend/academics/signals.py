"""
Signals que invalidan el caché de la libreta live cuando el docente
guarda notas, asistencia o registros RSA.

Flujo:
  Docente guarda nota → signal → cache.delete(key) → próxima petición
  recalcula y vuelve a cachear.

La latencia máxima de propagación es 5 minutos (TTL del caché),
pero con los signals es prácticamente instantánea.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache


def _boletin_key(tenant_id, alumno_id, periodo_id):
    return f"boletin_live_{tenant_id}_{alumno_id}_{periodo_id}"


@receiver([post_save, post_delete], sender='academics.Note')
def invalidate_on_note(sender, instance, **kwargs):
    """Nota guardada/eliminada → recalcular libreta del alumno en ese período."""
    try:
        alumno = instance.alumno
        periodo_id = instance.evaluacion.periodo_id
        cache.delete(_boletin_key(alumno.tenant_id, alumno.id, periodo_id))
    except Exception:
        pass


@receiver([post_save, post_delete], sender='academics.Attendance')
def invalidate_on_attendance(sender, instance, **kwargs):
    """
    Asistencia cambiada → invalidar para todos los períodos que
    contengan esa fecha (normalmente uno solo).
    """
    try:
        from academics.models import Period
        alumno = instance.alumno
        # Buscar períodos cuya ventana incluye la fecha del registro
        periodos = Period.objects.filter(
            tenant=alumno.tenant,
            fecha_inicio__lte=instance.fecha,
            fecha_fin__gte=instance.fecha,
        )
        for periodo in periodos:
            cache.delete(_boletin_key(alumno.tenant_id, alumno.id, periodo.id))
    except Exception:
        pass


@receiver([post_save, post_delete], sender='academics.Affective')
def invalidate_on_affective(sender, instance, **kwargs):
    """RSA guardado/eliminado → recalcular libreta."""
    try:
        alumno = instance.alumno
        cache.delete(_boletin_key(alumno.tenant_id, alumno.id, instance.periodo_id))
    except Exception:
        pass
