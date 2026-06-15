"""Imports URL configuration"""
from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.UploadCSVView.as_view(), name='import_upload'),
    path('history/', views.ImportHistoryView.as_view(), name='import_history'),
    path('<uuid:pk>/', views.ImportSessionDetailView.as_view(), name='import_detail'),
    path('<uuid:session_id>/resolve/', views.ResolveAnomaliesView.as_view(), name='import_resolve'),
    path('<uuid:session_id>/approve/', views.ApproveImportView.as_view(), name='import_approve'),
    path('<uuid:session_id>/report/', views.ImportReportView.as_view(), name='import_report'),
    path('<uuid:session_id>/anomalies/<uuid:anomaly_id>/explain/', views.ExplainAnomalyAIView.as_view(), name='explain_anomaly'),
]
