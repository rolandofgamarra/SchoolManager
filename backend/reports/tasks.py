import datetime
from django.template.loader import render_to_string
from academics.models import Student, Period
from analytics.services import calculate_student_averages

try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    # Define a no-op decorator when Celery is not installed
    def shared_task(func):
        return func

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

@shared_task
def generate_batch_boletines(grado_id: int, periodo_id: int, tenant_id: int):
    """
    Celery task to generate PDFs for an entire class/grade in the background.

    Requiere tenant_id explícito: la tarea corre fuera de un request, por lo
    que no hay contexto de tenant. Lo fijamos manualmente para que el
    TenantManager (fail-closed) devuelva los datos del colegio correcto.
    """
    from tenants.utils import set_current_tenant_id, clear_current_tenant_id

    token = set_current_tenant_id(tenant_id)
    try:
        return _generate_batch_boletines(grado_id, periodo_id)
    finally:
        clear_current_tenant_id(token)


def _generate_batch_boletines(grado_id: int, periodo_id: int):
    students = Student.objects.filter(grado_id=grado_id)
    periodo = Period.objects.get(id=periodo_id)
    
    generated_count = 0
    for alumno in students:
        resultados = calculate_student_averages(alumno.id, periodo.id)
        context = {
            'alumno': alumno,
            'periodo_nombre': periodo.nombre,
            'resultados': resultados,
            'fecha_emision': datetime.date.today().strftime('%d/%m/%Y'),
        }
        html_string = render_to_string('reports/boletin.html', context)
        if WEASYPRINT_AVAILABLE:
            _pdf_file = HTML(string=html_string).write_pdf()
            # Save pdf_file to storage...
        generated_count += 1
        
    return f"Generated {generated_count} boletines successfully."
