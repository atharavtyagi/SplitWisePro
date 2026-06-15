"""Audit utility — centralized logging helper used across all apps."""
from django.utils import timezone


def log_action(user, action, entity_type, entity_id, old_value=None, new_value=None, request=None):
    """Log an audit event. Import this helper in any view."""
    from .models import AuditLog
    ip = None
    user_agent = ''
    if request:
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
    AuditLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_value=old_value,
        new_value=new_value,
        ip_address=ip,
        user_agent=user_agent,
        timestamp=timezone.now(),
    )


def log_activity(user, group, action_type, description, metadata=None):
    """Log an activity feed entry."""
    from .models import ActivityLog
    ActivityLog.objects.create(
        user=user, group=group, action_type=action_type,
        description=description, metadata=metadata,
    )
