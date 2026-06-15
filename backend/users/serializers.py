"""Users serializers — Registration, login, profile"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    groups_count = serializers.SerializerMethodField()
    total_expenses = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_owed = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'avatar', 'bio', 'phone', 'preferred_currency', 'timezone',
            'is_email_verified', 'date_joined', 'groups_count',
            'total_expenses', 'total_paid', 'total_owed',
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'is_email_verified']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_groups_count(self, obj):
        return obj.memberships.filter(left_at__isnull=True).count()

    def get_total_expenses(self, obj):
        from expenses.models import ExpenseParticipant
        from django.db.models import Sum
        result = ExpenseParticipant.objects.filter(
            user=obj, expense__is_deleted=False
        ).aggregate(total=Sum('share_amount'))
        return float(result['total'] or 0)

    def get_total_paid(self, obj):
        from expenses.models import Expense
        from django.db.models import Sum
        result = Expense.objects.filter(
            paid_by=obj, is_deleted=False
        ).aggregate(total=Sum('amount'))
        return float(result['total'] or 0)

    def get_total_owed(self, obj):
        from expenses.models import ExpenseParticipant
        from django.db.models import Sum
        result = ExpenseParticipant.objects.filter(
            user=obj, expense__is_deleted=False, is_settled=False
        ).exclude(expense__paid_by=obj).aggregate(total=Sum('share_amount'))
        return float(result['total'] or 0)


class UserMiniSerializer(serializers.ModelSerializer):
    """Minimal user info for nested representations."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name', 'avatar']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
