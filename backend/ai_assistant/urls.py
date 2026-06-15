"""AI Assistant URLs"""
from django.urls import path
from . import views

urlpatterns = [
    path('explain-balance/', views.ExplainBalanceAIView.as_view(), name='ai_explain_balance'),
    path('chat/', views.AIAssistantView.as_view(), name='ai_chat'),
]
