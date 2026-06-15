"""Audit and Activity Log models — Notification moved to notifications app"""
from django.db import models
from django.conf import settings
import uuid


class AuditLog(models.Model):
    """Full audit trail — every important action logged with before/after values."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"{self.user} — {self.action} on {self.entity_type}:{self.entity_id}"


class ActivityLog(models.Model):
    """Activity feed entries for groups and global dashboard."""
    ACTION_CHOICES = [
        ('expense_added', 'Expense Added'),
        ('expense_edited', 'Expense Edited'),
        ('expense_deleted', 'Expense Deleted'),
        ('settlement_created', 'Settlement Created'),
        ('settlement_completed', 'Settlement Completed'),
        ('member_joined', 'Member Joined'),
        ('member_left', 'Member Left'),
        ('duplicate_resolved', 'Duplicate Resolved'),
        ('import_completed', 'Import Completed'),
        ('group_created', 'Group Created'),
        ('group_updated', 'Group Updated'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activities'
    )
    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE,
        related_name='activities', null=True, blank=True
    )
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['group', 'timestamp']),
        ]
