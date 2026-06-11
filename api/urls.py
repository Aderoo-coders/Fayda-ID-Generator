from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.auth import views as auth_views
from api.users import views as user_views
from api.jobs import views as job_views

urlpatterns = [
    path('auth/login/', auth_views.LoginView.as_view(), name='auth-login'),
    path('auth/google/', auth_views.GoogleAuthView.as_view(), name='auth-google'),
    path('users/me/', user_views.ProfileView.as_view(), name='users-me'),
    path('users/me/balance/', user_views.BalanceView.as_view(), name='users-balance'),
    path('jobs/', job_views.JobCreateView.as_view(), name='jobs-create'),
    path('jobs/<int:pk>/', job_views.JobDetailView.as_view(), name='jobs-detail'),
    path('jobs/<int:pk>/export/', job_views.JobExportView.as_view(), name='jobs-export'),
]
