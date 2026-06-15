"""Users views — Auth endpoints with JWT"""
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid

from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer
from .models import PasswordResetToken
from audit.utils import log_action

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        log_action(user, 'register', 'user', str(user.id))
        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        log_action(user, 'login', 'user', str(user.id))
        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            log_action(request.user, 'logout', 'user', str(request.user.id))
            return Response({'detail': 'Successfully logged out.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            token = PasswordResetToken.objects.create(
                user=user,
                expires_at=timezone.now() + timedelta(hours=1)
            )
            # In production: send email with token
            return Response({'detail': 'Password reset email sent.'})
        except User.DoesNotExist:
            # Don't reveal if email exists
            return Response({'detail': 'Password reset email sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_val = request.data.get('token')
        password = request.data.get('password')
        try:
            token = PasswordResetToken.objects.get(token=token_val, used=False)
            if timezone.now() > token.expires_at:
                return Response({'detail': 'Token expired.'}, status=status.HTTP_400_BAD_REQUEST)
            token.user.set_password(password)
            token.user.save()
            token.used = True
            token.save()
            return Response({'detail': 'Password reset successfully.'})
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not user.check_password(old_password):
            return Response({'detail': 'Incorrect old password.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        log_action(user, 'change_password', 'user', str(user.id))
        return Response({'detail': 'Password changed successfully.'})
