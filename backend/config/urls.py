"""SplitWise Pro AI — Root URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/groups/', include('groups.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/settlements/', include('settlements.urls')),
    path('api/imports/', include('imports.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/ai/', include('ai_assistant.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
