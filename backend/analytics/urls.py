from django.urls import path
from analytics.views import (
    DashboardStatsView, GradeAnalyticsView, StudentAnalyticsView,
    AtRiskStudentsView, MissingAssignmentsView, AlertsView
)

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('grades/<int:grado_id>/periods/<int:periodo_id>/', GradeAnalyticsView.as_view(), name='grade-analytics'),
    path('students/<int:alumno_id>/periods/<int:periodo_id>/', StudentAnalyticsView.as_view(), name='student-analytics'),
    path('at-risk/', AtRiskStudentsView.as_view(), name='at-risk-students'),
    path('missing-assignments/', MissingAssignmentsView.as_view(), name='missing-assignments'),
    path('alerts/', AlertsView.as_view(), name='alerts'),
]
