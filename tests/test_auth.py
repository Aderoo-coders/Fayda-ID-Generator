import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestAuth:
    def test_login_success(self, api_client, django_user_model):
        django_user_model.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        url = reverse('auth-login')
        resp = api_client.post(url, {'email': 'test@example.com', 'password': 'testpass123'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert 'access_token' in resp.data

    def test_login_invalid(self, api_client):
        url = reverse('auth-login')
        resp = api_client.post(url, {'email': 'bad@email.com', 'password': 'wrong'}, format='json')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED