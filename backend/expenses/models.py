"""Expenses app models — Full expense tracking with flexible split types"""
from django.db import models
from django.conf import settings
import uuid
from decimal import Decimal


class Expense(models.Model):
    SPLIT_TYPE_CHOICES = [
        ('equal', 'Equal Split'),
        ('exact', 'Exact Amount'),
        ('percent', 'Percentage'),
        ('shares', 'Shares'),
        ('settlement', 'Settlement Payment'),
    ]
    CURRENCY_CHOICES = [
        ('INR', '₹ Indian Rupee'),
        ('USD', '$ US Dollar'),
        ('EUR', '€ Euro'),
        ('GBP', '£ British Pound'),
        ('JPY', '¥ Japanese Yen'),
    ]
    CATEGORY_CHOICES = [
        ('food', 'Food & Dining'),
        ('transport', 'Transport'),
        ('accommodation', 'Accommodation'),
        ('entertainment', 'Entertainment'),
        ('shopping', 'Shopping'),
        ('utilities', 'Utilities'),
        ('healthcare', 'Healthcare'),
        ('travel', 'Travel'),
        ('education', 'Education'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='expenses'
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='INR')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    date = models.DateField()
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='paid_expenses'
    )
    split_type = models.CharField(max_length=15, choices=SPLIT_TYPE_CHOICES, default='equal')
    notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to='expense_attachments/', null=True, blank=True)
    is_settlement = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['group', 'date']),
            models.Index(fields=['paid_by', 'date']),
            models.Index(fields=['group', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.title} — {self.currency} {self.amount}"


class ExpenseParticipant(models.Model):
    """Tracks each member's share in an expense — foundation of the 'Explain My Balance' feature."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expense_shares'
    )
    share_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    share_percent = models.DecimalField(max_digits=7, decimal_places=4, default=Decimal('0'))
    shares = models.PositiveIntegerField(default=1)
    is_settled = models.BooleanField(default=False)

    class Meta:
        db_table = 'expense_participants'
        unique_together = [['expense', 'user']]
        indexes = [models.Index(fields=['expense', 'user'])]

    def __str__(self):
        return f"{self.user} owes {self.share_amount} for {self.expense}"
