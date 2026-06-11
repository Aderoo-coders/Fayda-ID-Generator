from django.contrib import admin
from core.models import User, Job, AuditLog, CreditLog


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'tier', 'credits_balance', 'created_at']
    list_filter = ['tier', 'created_at']
    search_fields = ['email', 'first_name', 'last_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'progress_percent', 'created_at']
    list_filter = ['status', 'created_at', 'tier']
    search_fields = ['user__email', 'id']
    readonly_fields = ['created_at', 'updated_at', 'celery_task_id']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource_type', 'resource_id', 'created_at']
    list_filter = ['action', 'resource_type', 'created_at']
    search_fields = ['user__email']
    readonly_fields = ['created_at']


@admin.register(CreditLog)
class CreditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'operation', 'amount', 'balance_after', 'created_at']
    list_filter = ['operation', 'created_at']
    search_fields = ['user__email']
    readonly_fields = ['created_at']
