from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from core.models import Job
from api.jobs.serializers import JobCreateSerializer, JobDetailSerializer
from workers.tasks import extract_job


class JobCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(user=request.user)
        # Queue Celery task
        task = extract_job.delay(job.id)
        job.celery_task_id = task.id
        job.save()
        return Response({'id': job.id, 'status': job.status}, status=status.HTTP_202_ACCEPTED)


class JobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        job = Job.objects.filter(pk=pk, user=request.user).first()
        if not job:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobDetailSerializer(job)
        return Response(serializer.data, status=status.HTTP_200_OK)


class JobExportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        # TODO: implement export queuing
        return Response({'detail': 'Not implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
