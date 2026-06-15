"""Audit serializers"""
from rest_framework import serializers
from .models import AuditLog, ActivityLog
from users.serializers import UserMiniSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 'ip_address', 'timestamp']


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'group', 'action_type', 'description', 'metadata', 'timestamp']
