from rest_framework.views import APIView
from rest_framework.response import Response


class PackagesListView(APIView):
    permission_classes = []

    def get(self, request):
        packages = [
            {'id': 1, 'name': 'Starter Pack', 'credits': 100, 'price_usd': '9.99'},
            {'id': 2, 'name': 'Pro Pack', 'credits': 500, 'price_usd': '39.99'},
            {'id': 3, 'name': 'Enterprise', 'credits': 5000, 'price_usd': '299.99'},
        ]
        return Response({'results': packages})
