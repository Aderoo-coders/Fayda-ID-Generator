from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with additional fields for Fayda"""
    
    TIER_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]
    
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    credits_balance = models.IntegerField(default=0)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='free')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['tier']),
        ]
    
    def __str__(self):
        return self.email


class Job(models.Model):
    """Main Job model for tracking PDF extraction tasks"""
    
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('preprocessing', 'Preprocessing'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs')
    input_file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    input_file_size = models.IntegerField(help_text='File size in bytes')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    progress_percent = models.IntegerField(default=0)
    
    # Extraction results stored as JSON
    extraction_result = models.JSONField(null=True, blank=True, default=dict)
    
    # Error handling
    error_message = models.TextField(blank=True)
    error_traceback = models.TextField(blank=True)
    
    # Processing metadata
    processing_time_seconds = models.FloatField(null=True, blank=True)
    credits_consumed = models.IntegerField(default=1)
    num_pages = models.IntegerField(default=1)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Job {self.id} - {self.user.email} - {self.status}"


class AuditLog(models.Model):
    """Track all user actions for compliance"""
    
    ACTION_CHOICES = [
        ('field_edit', 'Field Edit'),
        ('job_upload', 'Job Upload'),
        ('job_delete', 'Job Delete'),
        ('export', 'Export'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)  # 'job', 'extraction', 'user', etc.
    resource_id = models.IntegerField()
    
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.action} on {self.resource_type}"


class CreditLog(models.Model):
    """Track credit transactions"""
    
    OPERATION_CHOICES = [
        ('purchase', 'Purchase'),
        ('usage', 'Usage'),
        ('refund', 'Refund'),
        ('bonus', 'Bonus'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_logs')
    operation = models.CharField(max_length=20, choices=OPERATION_CHOICES)
    amount = models.IntegerField()
    balance_after = models.IntegerField()
    
    description = models.TextField(blank=True)
    related_job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.operation} ({self.amount})"
