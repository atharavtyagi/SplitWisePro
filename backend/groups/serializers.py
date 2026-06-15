"""Groups serializers"""
from rest_framework import serializers
from users.serializers import UserMiniSerializer
from .models import Group, GroupMember, GroupInvitation


class GroupMemberSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = GroupMember
        fields = ['id', 'user', 'role', 'joined_at', 'left_at', 'is_active']


class GroupSerializer(serializers.ModelSerializer):
    created_by = UserMiniSerializer(read_only=True)
    member_count = serializers.ReadOnlyField()
    total_expenses = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'currency', 'image',
            'created_by', 'member_count', 'total_expenses',
            'outstanding_balance', 'is_member', 'created_at', 'updated_at',
        ]

    def get_total_expenses(self, obj):
        from django.db.models import Sum
        result = obj.expenses.filter(is_deleted=False).aggregate(total=Sum('amount'))
        return float(result['total'] or 0)

    def get_outstanding_balance(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        from expenses.services import BalanceService
        balances = BalanceService.calculate_group_balances(obj.id)
        user_balance = balances.get(str(request.user.id), 0)
        return float(user_balance)

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.memberships.filter(user=request.user, left_at__isnull=True).exists()


class GroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'currency', 'image']

    def create(self, validated_data):
        user = self.context['request'].user
        group = Group.objects.create(created_by=user, **validated_data)
        GroupMember.objects.create(group=group, user=user, role='admin')
        return group


class MembershipTimelineSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    event_type = serializers.SerializerMethodField()
    event_date = serializers.SerializerMethodField()

    class Meta:
        model = GroupMember
        fields = ['id', 'user', 'role', 'joined_at', 'left_at', 'event_type', 'event_date']

    def get_event_type(self, obj):
        return 'active' if obj.left_at is None else 'left'

    def get_event_date(self, obj):
        return obj.left_at or obj.joined_at
