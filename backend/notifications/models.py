"""Notifications models — moved here from audit/models.py"""
from django.db import models
from django.conf import settings
import uuid


class Notification(models.Model):
    TYPE_CHOICES = [
        ('expense_added', 'Expense Added'),
        ('settlement_request', 'Settlement Request'),
        ('settlement_completed', 'Settlement Completed'),
        ('member_joined', 'Member Joined'),
        ('member_left', 'Member Left'),
        ('import_completed', 'Import Completed'),
        ('import_failed', 'Import Failed'),
        ('group_invitation', 'Group Invitation'),
        ('system', 'System Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    notification_type = models.CharField(max_length=25, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'is_read'])]

    def __str__(self):
        return f"{self.user} — {self.title}"
