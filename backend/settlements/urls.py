"""Settlements URL configuration"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.SettlementViewSet, basename='settlement')

urlpatterns = [path('', include(router.urls))]
