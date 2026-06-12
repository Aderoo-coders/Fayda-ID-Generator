from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.models import User


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'credits_balance': user.credits_balance,
            'tier': user.tier,
            'created_at': user.created_at,
        })


class BalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'credits_balance': user.credits_balance,
            'jobs_remaining_at_current_rate': user.credits_balance,
            'last_updated': user.updated_at,
        })
