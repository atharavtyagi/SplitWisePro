"""Imports app models — CSV import sessions, logs, and anomaly tracking"""
from django.db import models
from django.conf import settings
import uuid


class ImportSession(models.Model):
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('parsing', 'Parsing'),
        ('validating', 'Validating'),
        ('review', 'Awaiting Review'),
        ('approved', 'Approved'),
        ('importing', 'Importing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='import_sessions'
    )
    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='import_sessions'
    )
    file = models.FileField(upload_to='imports/')
    original_filename = models.CharField(max_length=255)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='uploaded')
    total_rows = models.IntegerField(default=0)
    valid_rows = models.IntegerField(default=0)
    imported_rows = models.IntegerField(default=0)
    skipped_rows = models.IntegerField(default=0)
    error_rows = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    report_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'import_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Import {self.id} by {self.user} — {self.status}"


class ImportAnomaly(models.Model):
    """Every anomaly detected during import — user must resolve each one."""
    ISSUE_TYPE_CHOICES = [
        ('duplicate', 'Duplicate Expense'),
        ('near_duplicate', 'Near Duplicate'),
        ('missing_field', 'Missing Required Field'),
        ('negative_amount', 'Negative Amount'),
        ('refund', 'Possible Refund'),
        ('settlement_as_expense', 'Settlement as Expense'),
        ('unknown_member', 'Unknown Member'),
        ('future_date', 'Future Date'),
        ('invalid_currency', 'Invalid Currency'),
        ('invalid_split', 'Invalid Split Values'),
        ('outside_membership', 'Outside Membership Period'),
        ('same_event', 'Possible Same Event'),
        ('malformed_row', 'Malformed Row'),
        ('incorrect_total', 'Incorrect Total'),
        ('missing_participants', 'Missing Participants'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
    ]
    USER_ACTION_CHOICES = [
        ('keep_first', 'Keep First'),
        ('keep_second', 'Keep Second'),
        ('merge', 'Merge'),
        ('ignore', 'Ignore Both'),
        ('mark_separate', 'Mark as Separate'),
        ('accept', 'Accept'),
        ('skip', 'Skip Row'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ImportSession, on_delete=models.CASCADE, related_name='anomalies')
    row_number = models.IntegerField()
    row_number_b = models.IntegerField(null=True, blank=True)  # For duplicates, the second row
    issue_type = models.CharField(max_length=30, choices=ISSUE_TYPE_CHOICES)
    description = models.TextField()
    suggested_action = models.TextField()
    row_data = models.JSONField(null=True, blank=True)         # Raw CSV row data
    row_data_b = models.JSONField(null=True, blank=True)       # Second row for comparison
    ai_explanation = models.TextField(blank=True)               # Gemini-generated explanation
    user_decision = models.CharField(
        max_length=15, choices=USER_ACTION_CHOICES, null=True, blank=True
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'import_anomalies'
        ordering = ['row_number']

    def __str__(self):
        return f"Row {self.row_number}: {self.issue_type}"
