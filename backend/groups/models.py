"""Groups app models — Group membership with timeline tracking"""
from django.db import models
from django.conf import settings
import uuid


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    currency = models.CharField(max_length=3, default='INR')
    image = models.ImageField(upload_to='groups/', null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_groups'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'groups'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['created_by', 'is_active'])]

    def __str__(self):
        return self.name

    @property
    def active_members(self):
        return self.memberships.filter(left_at__isnull=True)

    @property
    def member_count(self):
        return self.active_members.count()


class GroupMember(models.Model):
    """
    Tracks group membership with precise join/leave timestamps.
    Critical for the Membership Engine — expense calculations respect these periods.
    """
    ROLE_CHOICES = [('admin', 'Admin'), ('member', 'Member')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invited_members'
    )

    class Meta:
        db_table = 'group_members'
        indexes = [
            models.Index(fields=['group', 'user']),
            models.Index(fields=['group', 'left_at']),
        ]

    def __str__(self):
        return f"{self.user} in {self.group}"

    @property
    def is_active(self):
        return self.left_at is None

    def was_member_on(self, date) -> bool:
        """Check if user was a member on a specific date — core Membership Engine logic."""
        from django.utils import timezone
        if hasattr(date, 'date'):
            date = date.date()
        joined = self.joined_at.date() if hasattr(self.joined_at, 'date') else self.joined_at
        if joined > date:
            return False
        if self.left_at is None:
            return True
        left = self.left_at.date() if hasattr(self.left_at, 'date') else self.left_at
        return left >= date


class GroupInvitation(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined'), ('expired', 'Expired')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='invitations')
    invited_email = models.EmailField()
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invitations'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'group_invitations'
