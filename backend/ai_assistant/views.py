"""AI Assistant views — Gemini integration"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.conf import settings


class ExplainBalanceAIView(APIView):
    """Uses Gemini to explain why a user owes/is owed a specific amount."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('user_id', str(request.user.id))
        group_id = request.data.get('group_id')
        if not group_id:
            return Response({'error': 'group_id required'}, status=400)

        from expenses.services import BalanceService
        breakdown = BalanceService.explain_balance(user_id, group_id)
        net = sum(item['user_share'] for item in breakdown if not item['is_payer'])

        context = f"User owes a total of {net:.2f}. Here are the individual expenses:\n"
        for item in breakdown[:10]:
            context += f"- {item['expense_title']}: paid by {item['paid_by_name']}, user share = {item['user_share']:.2f} on {item['date']}\n"

        explanation = self._get_ai_explanation(context)
        return Response({
            'explanation': explanation,
            'net_balance': net,
            'breakdown': breakdown,
        })

    def _get_ai_explanation(self, context: str) -> str:
        if not settings.GEMINI_API_KEY:
            return f"Your balance is made up of individual expense shares. {context}"
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-pro')
            prompt = (
                "You are a friendly expense management assistant. "
                "Explain this user's balance in 2-3 sentences in plain language. "
                "Be specific about which expenses contribute most.\n\n" + context
            )
            return model.generate_content(prompt).text
        except Exception:
            return f"Your balance is calculated from the following expenses:\n{context}"


class AIAssistantView(APIView):
    """General AI chat assistant for the app."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = request.data.get('query', '')
        if not query:
            return Response({'error': 'query is required'}, status=400)

        response_text = self._get_response(query)
        return Response({'response': response_text})

    def _get_response(self, query: str) -> str:
        if not settings.GEMINI_API_KEY:
            return "AI assistant is not configured. Please add a Gemini API key."
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-pro')
            prompt = (
                "You are a helpful assistant for SplitWise Pro AI, an expense sharing application. "
                "Help the user with their question about expenses, groups, and settlements. "
                "Be concise and practical.\n\n"
                f"User question: {query}"
            )
            return model.generate_content(prompt).text
        except Exception as e:
            return f"AI assistant temporarily unavailable: {str(e)}"
