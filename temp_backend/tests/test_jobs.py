import pytest
from django.urls import reverse
from rest_framework import status
from core.models import Job
from io import BytesIO


@pytest.mark.django_db
class TestJobs:
    def test_create_job(self, authenticated_client):
        client, user = authenticated_client
        url = reverse('jobs-create')
        tiny_pdf = BytesIO(b'%PDF-1.4 fake pdf content')
        tiny_pdf.name = 'test.pdf'
        resp = client.post(url, {'file': tiny_pdf, 'input_file_size': 100}, format='multipart')
        assert resp.status_code == status.HTTP_202_ACCEPTED
        assert 'id' in resp.data

    def test_get_job_detail(self, authenticated_client):
        client, user = authenticated_client
        job = Job.objects.create(user=user, input_file_size=100)
        url = reverse('jobs-detail', args=[job.id])
        resp = client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['id'] == job.id

    def test_get_job_not_owner(self, authenticated_client, django_user_model):
        client, user = authenticated_client
        other_user = django_user_model.objects.create_user(email='other@example.com', password='other1234')
        job = Job.objects.create(user=other_user, input_file_size=100)
        url = reverse('jobs-detail', args=[job.id])
        resp = client.get(url)
        assert resp.status_code == status.HTTP_404_NOT_FOUND