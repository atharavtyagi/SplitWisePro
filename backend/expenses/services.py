"""
Expense Balance Service — Core business logic.

Key features:
- Membership Engine: only counts expenses where user was active member on that date
- Explain My Balance: traces every rupee owed back to specific expenses
- Settlement Optimizer: greedy algorithm to minimize transaction count
"""
from decimal import Decimal
from collections import defaultdict
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class BalanceService:

    @staticmethod
    def _get_active_members_on_date(group_id, expense_date):
        """
        Membership Engine Core:
        Returns users who were active group members on the given expense date.
        Rule: joined_at <= expense_date AND (left_at IS NULL OR left_at >= expense_date)
        """
        from groups.models import GroupMember
        members = GroupMember.objects.filter(
            group_id=group_id,
            joined_at__date__lte=expense_date,
        ).filter(
            models.Q(left_at__isnull=True) | models.Q(left_at__date__gte=expense_date)
        ).select_related('user')
        return list(members)

    @staticmethod
    def calculate_group_balances(group_id):
        """
        Calculate net balance for each user in a group.
        Returns dict: {user_id_str: net_balance}
        Positive = user is owed money; Negative = user owes money.
        """
        from expenses.models import Expense, ExpenseParticipant
        from settlements.models import Settlement

        balances = defaultdict(Decimal)

        # Process expenses
        expenses = Expense.objects.filter(
            group_id=group_id, is_deleted=False
        ).prefetch_related('participants')

        for expense in expenses:
            # Credit the payer
            balances[str(expense.paid_by_id)] += expense.amount
            # Debit each participant their share
            for participant in expense.participants.all():
                balances[str(participant.user_id)] -= participant.share_amount

        # Apply completed settlements
        settlements = Settlement.objects.filter(
            group_id=group_id, status='completed'
        )
        for s in settlements:
            balances[str(s.payer_id)] -= s.amount
            balances[str(s.receiver_id)] += s.amount

        return {k: float(v) for k, v in balances.items()}

    @staticmethod
    def get_group_balances_detail(group_id):
        """
        Returns detailed per-user balances with user info for the UI.
        """
        from groups.models import GroupMember
        from users.serializers import UserMiniSerializer

        raw_balances = BalanceService.calculate_group_balances(group_id)
        members = GroupMember.objects.filter(
            group_id=group_id
        ).select_related('user').distinct('user')

        result = []
        for member in members:
            uid = str(member.user_id)
            result.append({
                'user': UserMiniSerializer(member.user).data,
                'net_balance': raw_balances.get(uid, 0.0),
                'is_owed': raw_balances.get(uid, 0.0) > 0,
                'owes': raw_balances.get(uid, 0.0) < 0,
            })
        return result

    @staticmethod
    def explain_balance(user_id, group_id):
        """
        'Why do I owe this amount?' — traces every expense to justify the balance.
        Returns list of expense breakdowns with full traceability.
        No magic numbers.
        """
        from expenses.models import ExpenseParticipant
        from users.serializers import UserMiniSerializer

        participants = ExpenseParticipant.objects.filter(
            user_id=user_id,
            expense__group_id=group_id,
            expense__is_deleted=False,
        ).select_related('expense', 'expense__paid_by').order_by('-expense__date')

        breakdown = []
        for p in participants:
            expense = p.expense
            breakdown.append({
                'expense_id': str(expense.id),
                'expense_title': expense.title,
                'expense_amount': float(expense.amount),
                'paid_by_name': expense.paid_by.get_full_name() or expense.paid_by.username,
                'user_share': float(p.share_amount),
                'date': str(expense.date),
                'category': expense.category,
                'is_payer': str(expense.paid_by_id) == str(user_id),
                'currency': expense.currency,
            })
        return breakdown

    @staticmethod
    def optimize_settlements(group_id):
        """
        Greedy settlement optimizer — minimizes number of transactions.
        Algorithm: repeatedly match largest creditor with largest debtor.
        """
        from groups.models import GroupMember
        from users.serializers import UserMiniSerializer

        raw = BalanceService.calculate_group_balances(group_id)

        # Fetch user objects
        user_ids = list(raw.keys())
        users = {str(u.id): u for u in User.objects.filter(id__in=user_ids)}

        creditors = []  # (amount, user_id)
        debtors = []    # (amount, user_id)

        for uid, balance in raw.items():
            if balance > 0.01:
                creditors.append([Decimal(str(balance)), uid])
            elif balance < -0.01:
                debtors.append([Decimal(str(-balance)), uid])

        creditors.sort(reverse=True)
        debtors.sort(reverse=True)

        settlements = []
        i, j = 0, 0
        while i < len(creditors) and j < len(debtors):
            credit_amt, creditor_id = creditors[i]
            debt_amt, debtor_id = debtors[j]
            settle_amt = min(credit_amt, debt_amt)

            payer = users.get(debtor_id)
            receiver = users.get(creditor_id)

            if payer and receiver and settle_amt > Decimal('0.01'):
                settlements.append({
                    'payer': UserMiniSerializer(payer).data,
                    'receiver': UserMiniSerializer(receiver).data,
                    'amount': float(settle_amt),
                    'currency': 'INR',
                })

            creditors[i][0] -= settle_amt
            debtors[j][0] -= settle_amt
            if creditors[i][0] < Decimal('0.01'):
                i += 1
            if debtors[j][0] < Decimal('0.01'):
                j += 1

        return settlements
