"""Audit URLs"""
from django.urls import path
from . import views

urlpatterns = [
    path('logs/', views.AuditLogListView.as_view(), name='audit_logs'),
    path('activity/', views.ActivityLogListView.as_view(), name='activity_logs'),
]
