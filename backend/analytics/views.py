"""Analytics views — dashboard, trends, distributions"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from groups.models import Group, GroupMember
        from expenses.models import Expense, ExpenseParticipant
        from settlements.models import Settlement

        active_groups = Group.objects.filter(
            memberships__user=user, memberships__left_at__isnull=True, is_active=True
        ).distinct()

        total_groups = active_groups.count()

        total_expenses = Expense.objects.filter(
            group__in=active_groups, is_deleted=False
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Amount you owe (your share in others' expenses minus what you paid)
        your_shares = ExpenseParticipant.objects.filter(
            user=user, expense__group__in=active_groups, expense__is_deleted=False, is_settled=False
        ).exclude(expense__paid_by=user).aggregate(total=Sum('share_amount'))['total'] or 0

        # Amount owed to you (others' shares in expenses you paid)
        owed_to_you = ExpenseParticipant.objects.filter(
            expense__paid_by=user, expense__group__in=active_groups,
            expense__is_deleted=False, is_settled=False
        ).exclude(user=user).aggregate(total=Sum('share_amount'))['total'] or 0

        pending_settlements = Settlement.objects.filter(
            group__in=active_groups, status='pending'
        ).filter(payer=user).count() + Settlement.objects.filter(
            group__in=active_groups, status='pending'
        ).filter(receiver=user).count()

        return Response({
            'total_groups': total_groups,
            'total_expenses': float(total_expenses),
            'amount_you_owe': float(your_shares),
            'amount_owed_to_you': float(owed_to_you),
            'pending_settlements': pending_settlements,
        })


class SpendingTrendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from groups.models import Group
        from expenses.models import Expense

        months = int(request.query_params.get('months', 12))
        group_id = request.query_params.get('group')

        active_groups = Group.objects.filter(
            memberships__user=user, memberships__left_at__isnull=True, is_active=True
        ).distinct()

        qs = Expense.objects.filter(group__in=active_groups, is_deleted=False)
        if group_id:
            qs = qs.filter(group_id=group_id)

        since = timezone.now() - timedelta(days=30 * months)
        qs = qs.filter(date__gte=since)

        data = qs.annotate(month=TruncMonth('date')).values('month').annotate(
            total=Sum('amount'), count=Count('id')
        ).order_by('month')

        return Response([{
            'month': d['month'].strftime('%b %Y'),
            'total': float(d['total'] or 0),
            'count': d['count'],
        } for d in data])


class CategoryDistributionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from groups.models import Group
        from expenses.models import Expense

        group_id = request.query_params.get('group')
        active_groups = Group.objects.filter(
            memberships__user=request.user, memberships__left_at__isnull=True, is_active=True
        ).distinct()

        qs = Expense.objects.filter(group__in=active_groups, is_deleted=False)
        if group_id:
            qs = qs.filter(group_id=group_id)

        data = qs.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')
        return Response([{
            'category': d['category'],
            'total': float(d['total'] or 0),
            'count': d['count'],
        } for d in data])


class GroupSpendingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from groups.models import Group
        from expenses.models import Expense

        active_groups = Group.objects.filter(
            memberships__user=request.user, memberships__left_at__isnull=True, is_active=True
        ).distinct()

        result = []
        for group in active_groups:
            total = Expense.objects.filter(group=group, is_deleted=False).aggregate(
                total=Sum('amount')
            )['total'] or 0
            result.append({'group': group.name, 'group_id': str(group.id), 'total': float(total)})

        result.sort(key=lambda x: x['total'], reverse=True)
        return Response(result)
