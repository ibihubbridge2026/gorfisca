from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportingViewSet

router = DefaultRouter()
router.register(r'reporting', ReportingViewSet, basename='reporting')

urlpatterns = [
    path('', include(router.urls)),
]
