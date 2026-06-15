"""Expenses views — CRUD + balance + explain-balance"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Expense, ExpenseParticipant
from .serializers import ExpenseSerializer, ExpenseCreateSerializer
from .services import BalanceService
from audit.utils import log_action, log_activity


class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['group', 'category', 'split_type', 'paid_by', 'is_settlement']
    search_fields = ['title', 'description', 'notes']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        from groups.models import Group
        user_groups = Group.objects.filter(
            memberships__user=self.request.user,
            memberships__left_at__isnull=True,
            is_active=True,
        )
        return Expense.objects.filter(
            group__in=user_groups, is_deleted=False
        ).select_related('paid_by', 'created_by').prefetch_related('participants__user')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def perform_create(self, serializer):
        expense = serializer.save()
        log_action(
            self.request.user, 'expense_created', 'expense', str(expense.id),
            new_value={'title': expense.title, 'amount': str(expense.amount)},
            request=self.request
        )
        log_activity(self.request.user, expense.group, 'expense_added',
                     f"Added expense '{expense.title}' — {expense.currency} {expense.amount}")

    def perform_update(self, serializer):
        old = ExpenseSerializer(self.get_object()).data
        expense = serializer.save()
        log_action(self.request.user, 'expense_updated', 'expense', str(expense.id),
                   old_value=old, new_value={'title': expense.title, 'amount': str(expense.amount)})

    def perform_destroy(self, instance):
        old = ExpenseSerializer(instance).data
        instance.is_deleted = True
        instance.save()
        log_action(self.request.user, 'expense_deleted', 'expense', str(instance.id), old_value=old)

    @action(detail=True, methods=['get'])
    def breakdown(self, request, pk=None):
        expense = self.get_object()
        serializer = ExpenseSerializer(expense)
        return Response(serializer.data)


class BalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        group_id = request.query_params.get('group')
        if not group_id:
            return Response({'error': 'group parameter required'}, status=400)
        balances = BalanceService.get_group_balances_detail(group_id)
        return Response(balances)


class ExplainBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = request.query_params.get('user', str(request.user.id))
        group_id = request.query_params.get('group')
        if not group_id:
            return Response({'error': 'group parameter required'}, status=400)
        breakdown = BalanceService.explain_balance(user_id, group_id)
        net = sum(item['user_share'] for item in breakdown if not item['is_payer'])
        paid = sum(item['expense_amount'] for item in breakdown if item['is_payer'])
        return Response({
            'user_id': user_id,
            'group_id': group_id,
            'breakdown': breakdown,
            'total_owed': net,
            'total_paid': paid,
        })


class OptimizeSettlementsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        group_id = request.query_params.get('group')
        if not group_id:
            return Response({'error': 'group parameter required'}, status=400)
        settlements = BalanceService.optimize_settlements(group_id)
        return Response(settlements)
