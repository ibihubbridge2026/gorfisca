from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('feedbacks', views.UserFeedbackViewSet, basename='feedback')
router.register('aggregations', views.FeedbackAggregationViewSet, basename='feedback-aggregation')

urlpatterns = router.urls
