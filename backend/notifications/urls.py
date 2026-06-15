"""Notifications URLs"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notifications'),
    path('mark-all-read/', views.MarkAllReadView.as_view(), name='mark_all_read'),
    path('unread-count/', views.UnreadCountView.as_view(), name='unread_count'),
    path('<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification_detail'),
]
