from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('logs', views.AuditLogViewSet, basename='audit-log')
router.register('journal-entries', views.JournalEntryAuditViewSet, basename='journal-entry-audit')
router.register('system', views.SystemAuditViewSet, basename='system-audit')

urlpatterns = router.urls
