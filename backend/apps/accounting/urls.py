from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountViewSet, JournalEntryViewSet, JournalLineViewSet

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'journal-entries', JournalEntryViewSet, basename='journalentry')
router.register(r'journal-lines', JournalLineViewSet, basename='journalline')

urlpatterns = [
    path('', include(router.urls)),
]
