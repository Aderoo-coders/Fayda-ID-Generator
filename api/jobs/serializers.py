from rest_framework import serializers
from core.models import Job


class JobCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['id', 'input_file', 'input_file_size', 'status', 'progress_percent']
        read_only_fields = ['id', 'status', 'progress_percent']


class JobDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['id', 'user', 'status', 'progress_percent', 'extraction_result', 'created_at', 'completed_at']
        read_only_fields = ['id', 'user', 'status', 'progress_percent', 'extraction_result', 'created_at', 'completed_at']
