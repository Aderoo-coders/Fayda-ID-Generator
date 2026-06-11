"""
URL configuration for Fayda backend.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# Health check endpoint
class HealthCheckView(APIView):
    permission_classes = []
    
    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Health check
    path('health/', HealthCheckView.as_view(), name='health-check'),
    
    # API
    path('api/', include('api.urls')),
]
