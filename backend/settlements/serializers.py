"""Settlements serializers"""
from rest_framework import serializers
from users.serializers import UserMiniSerializer
from .models import Settlement


class SettlementSerializer(serializers.ModelSerializer):
    payer = UserMiniSerializer(read_only=True)
    receiver = UserMiniSerializer(read_only=True)
    payer_id = serializers.UUIDField(write_only=True)
    receiver_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Settlement
        fields = [
            'id', 'group', 'payer', 'payer_id', 'receiver', 'receiver_id',
            'amount', 'currency', 'status', 'notes', 'settled_at', 'created_at',
        ]
        read_only_fields = ['status', 'settled_at']

    def create(self, validated_data):
        payer_id = validated_data.pop('payer_id')
        receiver_id = validated_data.pop('receiver_id')
        user = self.context['request'].user
        return Settlement.objects.create(
            payer_id=payer_id, receiver_id=receiver_id,
            created_by=user, **validated_data
        )
