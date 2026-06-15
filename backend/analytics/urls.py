"""Analytics URLs"""
from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('spending-trend/', views.SpendingTrendView.as_view(), name='spending_trend'),
    path('category-distribution/', views.CategoryDistributionView.as_view(), name='category_distribution'),
    path('group-spending/', views.GroupSpendingView.as_view(), name='group_spending'),
]
