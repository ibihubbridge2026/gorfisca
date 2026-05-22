from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/organizations/', include('apps.organizations.urls')),
    path('api/v1/accounting/', include('apps.accounting.urls')),
    path('api/v1/invoicing/', include('apps.invoicing.urls')),
    path('api/v1/reconciliation/', include('apps.reconciliation.urls')),
    path('api/v1/ai/', include('apps.ai_assistant.urls')),
    path('api/v1/feedback/', include('apps.feedback.urls')),
    path('api/v1/core/', include('apps.core.urls')),
    path('api/v1/integrations/', include('apps.integrations.urls')),
    path('api/v1/', include('apps.reporting.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
