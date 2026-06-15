"""Imports serializers"""
from rest_framework import serializers
from .models import ImportSession, ImportAnomaly


class ImportAnomalySerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportAnomaly
        fields = [
            'id', 'row_number', 'row_number_b', 'issue_type', 'description',
            'suggested_action', 'row_data', 'row_data_b', 'ai_explanation',
            'user_decision', 'status', 'created_at', 'resolved_at',
        ]


class ImportSessionSerializer(serializers.ModelSerializer):
    anomalies = ImportAnomalySerializer(many=True, read_only=True)

    class Meta:
        model = ImportSession
        fields = [
            'id', 'status', 'original_filename', 'total_rows', 'valid_rows',
            'imported_rows', 'skipped_rows', 'error_rows', 'error_message',
            'anomalies', 'created_at', 'updated_at', 'completed_at',
        ]


class AnomalyResolutionSerializer(serializers.Serializer):
    decisions = serializers.DictField(
        child=serializers.CharField(),
        help_text='Map of {anomaly_id: user_decision}'
    )
