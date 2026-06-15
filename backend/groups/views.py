"""Groups views — full CRUD + membership management"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Group, GroupMember
from .serializers import GroupSerializer, GroupCreateSerializer, GroupMemberSerializer, MembershipTimelineSerializer
from audit.utils import log_action, log_activity
from users.serializers import UserMiniSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class IsGroupMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(user=request.user, left_at__isnull=True).exists()


class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(
            memberships__user=self.request.user,
            memberships__left_at__isnull=True,
            is_active=True,
        ).distinct()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GroupCreateSerializer
        return GroupSerializer

    def perform_create(self, serializer):
        group = serializer.save()
        log_action(self.request.user, 'group_created', 'group', str(group.id), new_value={'name': group.name})
        log_activity(self.request.user, group, 'group_created', f"Created group '{group.name}'")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        log_action(self.request.user, 'group_deleted', 'group', str(instance.id))

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        group = self.get_object()
        memberships = group.memberships.select_related('user').order_by('joined_at')
        serializer = GroupMemberSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite_member(self, request, pk=None):
        group = self.get_object()
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=400)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': f'No user found with email {email}.'}, status=404)

        existing = group.memberships.filter(user=user, left_at__isnull=True).first()
        if existing:
            return Response({'error': 'User is already a member.'}, status=400)

        # Re-add if previously left
        old = group.memberships.filter(user=user).order_by('-joined_at').first()
        if old and old.left_at:
            member = GroupMember.objects.create(
                group=group, user=user, role='member', invited_by=request.user
            )
        else:
            member = GroupMember.objects.create(
                group=group, user=user, role='member', invited_by=request.user
            )

        log_activity(request.user, group, 'member_joined', f"{user.get_full_name()} joined '{group.name}'")
        log_action(request.user, 'member_invited', 'group_member', str(member.id))
        return Response(GroupMemberSerializer(member).data, status=201)

    @action(detail=True, methods=['delete'], url_path='remove-member/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        group = self.get_object()
        member = get_object_or_404(GroupMember, group=group, user_id=user_id, left_at__isnull=True)
        member.left_at = timezone.now()
        member.save()
        log_activity(request.user, group, 'member_left', f"Member left '{group.name}'")
        log_action(request.user, 'member_removed', 'group_member', str(member.id))
        return Response({'detail': 'Member removed.'})

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        group = self.get_object()
        memberships = group.memberships.select_related('user').order_by('joined_at')
        events = []
        for m in memberships:
            events.append({
                'user': UserMiniSerializer(m.user).data,
                'event_type': 'joined',
                'date': m.joined_at,
                'role': m.role,
            })
            if m.left_at:
                events.append({
                    'user': UserMiniSerializer(m.user).data,
                    'event_type': 'left',
                    'date': m.left_at,
                    'role': m.role,
                })
        events.sort(key=lambda x: x['date'])
        return Response(events)

    @action(detail=True, methods=['get'])
    def balances(self, request, pk=None):
        group = self.get_object()
        from expenses.services import BalanceService
        balances = BalanceService.get_group_balances_detail(str(group.id))
        return Response(balances)

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        group = self.get_object()
        from audit.models import ActivityLog
        from audit.serializers import ActivityLogSerializer
        logs = ActivityLog.objects.filter(group=group).select_related('user')[:50]
        return Response(ActivityLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['get'])
    def optimize_settlements(self, request, pk=None):
        group = self.get_object()
        from expenses.services import BalanceService
        settlements = BalanceService.optimize_settlements(str(group.id))
        return Response(settlements)
