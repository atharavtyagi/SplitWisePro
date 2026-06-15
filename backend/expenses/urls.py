"""Expenses URL configuration"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.ExpenseViewSet, basename='expense')

urlpatterns = [
    path('balances/', views.BalanceView.as_view(), name='balances'),
    path('explain-balance/', views.ExplainBalanceView.as_view(), name='explain_balance'),
    path('optimize-settlements/', views.OptimizeSettlementsView.as_view(), name='optimize_settlements'),
    path('', include(router.urls)),
]
