from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIAssistantViewSet

router = DefaultRouter()
router.register(r'assistant', AIAssistantViewSet, basename='ai-assistant')

urlpatterns = [
    path('', include(router.urls)),
]
