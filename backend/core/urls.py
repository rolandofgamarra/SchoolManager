"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import CustomTokenObtainPairView
from academics.views import (
    GradeLevelViewSet, StudentViewSet, SubjectViewSet, PeriodViewSet,
    EvaluationViewSet, NoteViewSet, AttendanceViewSet, AffectiveViewSet,
    AnnualPlanViewSet
)

# Register academics viewsets with DRF DefaultRouter
router = DefaultRouter()
router.register(r'grados', GradeLevelViewSet, basename='grado')
router.register(r'alumnos', StudentViewSet, basename='alumno')
router.register(r'materias', SubjectViewSet, basename='materia')
router.register(r'periodos', PeriodViewSet, basename='periodo')
router.register(r'evaluaciones', EvaluationViewSet, basename='evaluacion')
router.register(r'notas', NoteViewSet, basename='nota')
router.register(r'asistencia', AttendanceViewSet, basename='asistencia')
router.register(r'socioafectivo', AffectiveViewSet, basename='socioafectivo')
router.register(r'planes-anuales', AnnualPlanViewSet, basename='plan-anual')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints
    path('api/users/', include('users.urls')),
    path('api/sync/', include('sync_engine.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/tenant/', include('tenants.urls')),
    path('api/reports/', include('reports.urls')),
    
    # Academics API CRUD endpoints
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
