from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('sources', views.IntegrationSourceViewSet, basename='integration-source')
router.register('ingestions', views.RawIngestionViewSet, basename='raw-ingestion')
router.register('transactions', views.NormalizedTransactionViewSet, basename='normalized-transaction')
router.register('', views.IntegrationsViewSet, basename='integrations')

urlpatterns = router.urls
