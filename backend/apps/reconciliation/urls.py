from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BankTransactionViewSet, ReconciliationRuleViewSet, ImportBatchViewSet

router = DefaultRouter()
router.register(r'transactions', BankTransactionViewSet, basename='banktransaction')
router.register(r'rules', ReconciliationRuleViewSet, basename='reconciliationrule')
router.register(r'imports', ImportBatchViewSet, basename='importbatch')

urlpatterns = [
    path('', include(router.urls)),
]
