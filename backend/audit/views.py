"""Audit views"""
from rest_framework import generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog, ActivityLog
from .serializers import AuditLogSerializer, ActivityLogSerializer


class AuditLogListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['entity_type', 'action']

    def get_queryset(self):
        return AuditLog.objects.filter(user=self.request.user).select_related('user').order_by('-timestamp')


class ActivityLogListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        qs = ActivityLog.objects.select_related('user', 'group').order_by('-timestamp')
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        else:
            from groups.models import Group
            user_groups = Group.objects.filter(
                memberships__user=self.request.user, memberships__left_at__isnull=True
            )
            qs = qs.filter(group__in=user_groups)
        return qs[:100]
