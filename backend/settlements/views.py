"""Settlements views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import Settlement
from .serializers import SettlementSerializer
from audit.utils import log_action, log_activity


class SettlementViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SettlementSerializer

    def get_queryset(self):
        qs = Settlement.objects.select_related('payer', 'receiver', 'group')
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs.filter(
            payer=self.request.user
        ) | qs.filter(receiver=self.request.user)

    def perform_create(self, serializer):
        settlement = serializer.save()
        log_action(self.request.user, 'settlement_created', 'settlement', str(settlement.id))
        log_activity(self.request.user, settlement.group, 'settlement_created',
                     f"Settlement of {settlement.currency} {settlement.amount} recorded")

    @action(detail=True, methods=['patch'], url_path='mark-settled')
    def mark_settled(self, request, pk=None):
        settlement = self.get_object()
        if settlement.status == 'completed':
            return Response({'error': 'Already settled.'}, status=400)
        settlement.status = 'completed'
        settlement.settled_at = timezone.now()
        settlement.save()
        log_action(request.user, 'settlement_completed', 'settlement', str(settlement.id))
        log_activity(request.user, settlement.group, 'settlement_completed',
                     f"Settlement of {settlement.currency} {settlement.amount} completed")
        return Response(SettlementSerializer(settlement).data)

    @action(detail=True, methods=['patch'], url_path='undo')
    def undo(self, request, pk=None):
        settlement = self.get_object()
        settlement.status = 'pending'
        settlement.settled_at = None
        settlement.save()
        log_action(request.user, 'settlement_undone', 'settlement', str(settlement.id))
        return Response(SettlementSerializer(settlement).data)
