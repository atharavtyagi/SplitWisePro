"""Imports views — 5-step wizard API"""
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ImportSession, ImportAnomaly
from .serializers import ImportSessionSerializer, ImportAnomalySerializer, AnomalyResolutionSerializer
from .importer import ImportProcessor


class UploadCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        group_id = request.data.get('group_id')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)
        if not group_id:
            return Response({'error': 'group_id is required.'}, status=400)
        if not file.name.endswith('.csv'):
            return Response({'error': 'Only CSV files are accepted.'}, status=400)

        from groups.models import Group
        try:
            group = Group.objects.get(id=group_id, memberships__user=request.user, memberships__left_at__isnull=True)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found or you are not a member.'}, status=404)

        session = ImportSession.objects.create(
            user=request.user, group=group, file=file,
            original_filename=file.name, status='uploaded',
        )
        try:
            processor = ImportProcessor(session)
            processor.process()
        except Exception as e:
            return Response({'error': str(e), 'session_id': str(session.id)}, status=500)

        return Response(ImportSessionSerializer(session).data, status=201)


class ImportSessionDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ImportSessionSerializer

    def get_queryset(self):
        return ImportSession.objects.filter(user=self.request.user)


class ResolveAnomaliesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = ImportSession.objects.get(id=session_id, user=request.user)
        except ImportSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=404)

        serializer = AnomalyResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decisions = serializer.validated_data['decisions']

        for anomaly_id, decision in decisions.items():
            ImportAnomaly.objects.filter(id=anomaly_id, session=session).update(
                user_decision=decision, status='resolved'
            )

        return Response({'detail': f'{len(decisions)} anomalies resolved.'})


class ApproveImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = ImportSession.objects.get(id=session_id, user=request.user)
        except ImportSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=404)

        if session.status not in ['review', 'validating']:
            return Response({'error': f'Cannot approve import in status: {session.status}'}, status=400)

        decisions = request.data.get('decisions', {})
        try:
            processor = ImportProcessor(session)
            processor.approve_and_import(decisions)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response(ImportSessionSerializer(session).data)


class ImportReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ImportSession.objects.get(id=session_id, user=request.user)
        except ImportSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=404)
        processor = ImportProcessor(session)
        return Response(processor.generate_report())


class ImportHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ImportSessionSerializer

    def get_queryset(self):
        return ImportSession.objects.filter(user=self.request.user).order_by('-created_at')


class ExplainAnomalyAIView(APIView):
    """Calls Gemini to explain an anomaly in plain language."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id, anomaly_id):
        try:
            anomaly = ImportAnomaly.objects.get(id=anomaly_id, session__user=request.user)
        except ImportAnomaly.DoesNotExist:
            return Response({'error': 'Anomaly not found.'}, status=404)

        from django.conf import settings
        explanation = self._get_ai_explanation(anomaly, settings.GEMINI_API_KEY)
        anomaly.ai_explanation = explanation
        anomaly.save()
        return Response({'explanation': explanation, 'anomaly_id': str(anomaly_id)})

    def _get_ai_explanation(self, anomaly, api_key):
        if not api_key:
            return self._fallback_explanation(anomaly)
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-pro')
            prompt = (
                f"You are a helpful expense management assistant. "
                f"Explain this CSV import anomaly to a non-technical user in 2-3 sentences.\n\n"
                f"Issue Type: {anomaly.issue_type}\n"
                f"Description: {anomaly.description}\n"
                f"Row Data: {anomaly.row_data}\n\n"
                f"Explain what happened, why it matters, and what the user should do. Be concise and friendly."
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return self._fallback_explanation(anomaly)

    def _fallback_explanation(self, anomaly):
        fallbacks = {
            'duplicate': 'Two rows in your CSV appear to be the same expense. Please decide which one to keep to avoid double-counting.',
            'near_duplicate': 'Two rows look very similar but have slightly different amounts. They may represent the same expense with a typo.',
            'missing_field': f'This row is missing required information: {anomaly.description}. Please check the original data.',
            'negative_amount': 'This expense has a negative amount, which usually means it is a refund or credit. Please verify.',
            'future_date': 'This expense is dated in the future. Please check whether the date is correct.',
            'unknown_member': 'The person listed as the payer is not a member of your group. Please invite them first.',
            'outside_membership': 'The expense date falls outside the period when this person was a member of the group.',
            'invalid_currency': 'The currency code in this row is not recognized. Please use a standard 3-letter code like INR, USD, EUR.',
            'refund': 'This row looks like a refund or reimbursement, not a regular expense.',
            'settlement_as_expense': 'This row looks like a settlement payment rather than a shared expense.',
            'malformed_row': 'This row could not be read correctly. The data format may be invalid.',
        }
        return fallbacks.get(anomaly.issue_type, anomaly.suggested_action)
