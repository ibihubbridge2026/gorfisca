from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
from .models import AIMonitoringLog, HealthCheck


@api_view(['GET'])
def health_check(request):
    """
    Endpoint léger pour vérifier la santé du système et le taux de succès de l'IA
    """
    try:
        # Calculer les statistiques IA sur les 100 derniers appels
        recent_logs = AIMonitoringLog.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).order_by('-timestamp')[:100]
        
        total_calls = recent_logs.count()
        success_calls = recent_logs.filter(status='success').count()
        fallback_calls = recent_logs.filter(status='fallback').count()
        error_calls = recent_logs.filter(status='error').count()
        
        # Calculer le taux de succès
        success_rate = (success_calls / total_calls * 100) if total_calls > 0 else 0
        fallback_rate = (fallback_calls / total_calls * 100) if total_calls > 0 else 0
        
        # Vérifier la santé des services
        services_status = {
            'database': _check_database_health(),
            'ai_service': _check_ai_service_health(),
            'storage': _check_storage_health(),
        }
        
        # Statut global
        overall_status = 'healthy'
        if any(service['status'] != 'healthy' for service in services_status.values()):
            overall_status = 'degraded'
        if success_rate < 50:  # Si le taux de succès IA est très bas
            overall_status = 'unhealthy'
        
        response_data = {
            'status': overall_status,
            'timestamp': timezone.now().isoformat(),
            'version': '1.0.0',
            'ai_monitoring': {
                'total_calls_last_24h': total_calls,
                'success_rate': round(success_rate, 2),
                'fallback_rate': round(fallback_rate, 2),
                'error_rate': round(error_calls / total_calls * 100, 2) if total_calls > 0 else 0,
                'recent_performance': {
                    'success_calls': success_calls,
                    'fallback_calls': fallback_calls,
                    'error_calls': error_calls
                }
            },
            'services': services_status,
            'recommendations': _generate_health_recommendations(success_rate, fallback_rate, services_status)
        }
        
        # Logger le health check
        HealthCheck.objects.create(
            service_name='system',
            status=overall_status,
            response_time_ms=0  # Could be measured with Django middleware
        )
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        # Logger l'erreur
        HealthCheck.objects.create(
            service_name='system',
            status='unhealthy',
            error_message=str(e)
        )
        
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _check_database_health():
    """Vérifier la santé de la base de données"""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {'status': 'healthy', 'response_time_ms': 0}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}


def _check_ai_service_health():
    """Vérifier la santé du service IA"""
    try:
        from apps.core.ai_client import get_ai_client
        ai_client = get_ai_client()
        if ai_client:
            return {'status': 'healthy', 'response_time_ms': 0}
        else:
            return {'status': 'degraded', 'error': 'AI client not available'}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}


def _check_storage_health():
    """Vérifier la santé du stockage"""
    try:
        import os
        # Vérifier l'accès en écriture sur le dossier media
        media_path = 'media'
        if not os.path.exists(media_path):
            os.makedirs(media_path, exist_ok=True)
        
        test_file = os.path.join(media_path, 'health_check.tmp')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        
        return {'status': 'healthy', 'response_time_ms': 0}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}


def _generate_health_recommendations(success_rate, fallback_rate, services_status):
    """Générer des recommandations basées sur la santé du système"""
    recommendations = []
    
    if success_rate < 80:
        recommendations.append("Le taux de succès de l'IA est faible. Vérifiez la configuration de Mistral AI.")
    
    if fallback_rate > 30:
        recommendations.append("Le taux de fallback est élevé. Considérez améliorer la qualité des données d'entrée.")
    
    if services_status['database']['status'] != 'healthy':
        recommendations.append("Problème de base de données détecté. Vérifiez la connexion et l'espace disque.")
    
    if services_status['ai_service']['status'] != 'healthy':
        recommendations.append("Service IA indisponible. Vérifiez votre clé API Mistral.")
    
    if services_status['storage']['status'] != 'healthy':
        recommendations.append("Problème de stockage. Vérifiez les permissions et l'espace disque.")
    
    return recommendations
