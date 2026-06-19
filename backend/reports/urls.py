from django.urls import path
from reports.views import LiveBoletinView, BoletinPDFView, ParentBoletinesView

urlpatterns = [
    # Libreta en tiempo real (JSON) — docente y padre
    path('boletin/<int:alumno_id>/<int:periodo_id>/', LiveBoletinView.as_view(), name='boletin-live'),
    # Descarga PDF
    path('boletin/<int:alumno_id>/<int:periodo_id>/pdf/', BoletinPDFView.as_view(), name='boletin-pdf'),
    # Portal de padres — mis hijos
    path('mis-boletines/', ParentBoletinesView.as_view(), name='parent-boletines'),
]
