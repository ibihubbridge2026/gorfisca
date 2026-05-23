from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Importer ReportingViewSet depuis views_main.py
from apps.reporting.views_main import ReportingViewSet
from apps.reporting.views.onboarding_views import OnboardingCompleteView, OnboardingStatusView

router = DefaultRouter()
router.register(r'reporting', ReportingViewSet, basename='reporting')

urlpatterns = [
    path('', include(router.urls)),
    path('onboarding/complete/', OnboardingCompleteView.as_view(), name='onboarding-complete'),
    path('onboarding/status/', OnboardingStatusView.as_view(), name='onboarding-status'),
]
