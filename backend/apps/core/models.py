from django.db import models
from django.utils import timezone


class AIMonitoringLog(models.Model):
    """
    Modèle pour stocker les logs de monitoring de l'IA
    Permet de calculer les taux de succès et de fallback
    """
    
    ACTION_TYPES = [
        ('magic_match', 'Magic Match'),
        ('document_analysis', 'Document Analysis'),
        ('journal_entry_suggestion', 'Journal Entry Suggestion'),
    ]
    
    STATUS_TYPES = [
        ('success', 'Success'),
        ('fallback', 'Fallback'),
        ('error', 'Error'),
    ]
    
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(
        'organizations.Organization', 
        on_delete=models.CASCADE,
        related_name='ai_logs'
    )
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    processing_time_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'action_type', 'status']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action_type} - {self.status} - {self.timestamp}"


class HealthCheck(models.Model):
    """
    Modèle pour stocker les résultats des health checks
    """
    
    service_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20)  # healthy, unhealthy, degraded
    response_time_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['service_name', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.service_name} - {self.status}"
