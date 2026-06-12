from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from core.models import User


class ProfileView(APIView):
    """Get current user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        data = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'credits_balance': user.credits_balance,
            'tier': user.tier,
            'created_at': user.created_at,
        }
        return Response(data, status=status.HTTP_200_OK)


class BalanceView(APIView):
    """Get user's credit balance"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        data = {
            'credits_balance': user.credits_balance,
            'jobs_remaining_at_current_rate': user.credits_balance,  # 1 credit per job
            'last_updated': user.updated_at,
        }
        return Response(data, status=status.HTTP_200_OK)
