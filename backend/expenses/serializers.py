"""Expenses serializers — handles all split types"""
from rest_framework import serializers
from decimal import Decimal
from users.serializers import UserMiniSerializer
from .models import Expense, ExpenseParticipant


class ExpenseParticipantSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ExpenseParticipant
        fields = ['id', 'user', 'user_id', 'share_amount', 'share_percent', 'shares', 'is_settled']


class ExpenseSerializer(serializers.ModelSerializer):
    paid_by = UserMiniSerializer(read_only=True)
    participants = ExpenseParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'group', 'title', 'description', 'amount', 'currency',
            'category', 'date', 'paid_by', 'split_type', 'participants',
            'notes', 'attachment', 'is_settlement', 'created_at', 'updated_at',
        ]


class ExpenseCreateSerializer(serializers.ModelSerializer):
    participants = ExpenseParticipantSerializer(many=True, write_only=True, required=False)
    paid_by_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Expense
        fields = [
            'id', 'group', 'title', 'description', 'amount', 'currency',
            'category', 'date', 'paid_by_id', 'split_type', 'participants',
            'notes', 'attachment', 'is_settlement',
        ]

    def validate(self, data):
        split_type = data.get('split_type', 'equal')
        participants = data.get('participants', [])
        amount = data.get('amount', Decimal('0'))

        if split_type == 'percent' and participants:
            total = sum(Decimal(str(p.get('share_percent', 0))) for p in participants)
            if abs(total - Decimal('100')) > Decimal('0.01'):
                raise serializers.ValidationError(
                    f'Percentages must sum to 100%. Current sum: {total}%'
                )

        if split_type == 'exact' and participants:
            total = sum(Decimal(str(p.get('share_amount', 0))) for p in participants)
            if abs(total - amount) > Decimal('0.01'):
                raise serializers.ValidationError(
                    f'Share amounts must sum to {amount}. Current sum: {total}'
                )

        return data

    def create(self, validated_data):
        participants_data = validated_data.pop('participants', [])
        paid_by_id = validated_data.pop('paid_by_id', None)
        user = self.context['request'].user

        from django.contrib.auth import get_user_model
        User = get_user_model()
        paid_by = User.objects.get(id=paid_by_id) if paid_by_id else user

        expense = Expense.objects.create(
            paid_by=paid_by, created_by=user, **validated_data
        )
        self._create_participants(expense, participants_data, user)
        return expense

    def _create_participants(self, expense, participants_data, requesting_user):
        """Create participant records based on split_type."""
        from django.contrib.auth import get_user_model
        from groups.models import GroupMember
        User = get_user_model()

        if expense.split_type == 'equal' and not participants_data:
            # Auto-split equally among all active members on expense date
            active_members = GroupMember.objects.filter(
                group=expense.group,
                joined_at__date__lte=expense.date,
            ).filter(
                __import__('django.db.models', fromlist=['Q']).Q(left_at__isnull=True) |
                __import__('django.db.models', fromlist=['Q']).Q(left_at__date__gte=expense.date)
            ).values_list('user_id', flat=True).distinct()

            member_list = list(active_members)
            if not member_list:
                return
            share = expense.amount / len(member_list)
            percent = Decimal('100') / len(member_list)
            for uid in member_list:
                ExpenseParticipant.objects.create(
                    expense=expense, user_id=uid,
                    share_amount=share, share_percent=percent, shares=1
                )
        else:
            for p in participants_data:
                uid = p.pop('user_id')
                ExpenseParticipant.objects.create(expense=expense, user_id=uid, **p)
